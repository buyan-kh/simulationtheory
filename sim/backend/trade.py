import random
from models import (
    Character, Action, ActionType, Event, EventType,
    SimulationState, TradeOffer, TradeHistory,
)


class TradeManager:

    def process_market(self, sim: SimulationState, actions: dict[str, Action]) -> list[Event]:
        events: list[Event] = []

        # Characters performing TRADE action create or accept offers
        for char_id, action in actions.items():
            if action.type != ActionType.TRADE:
                continue
            char = sim.characters.get(char_id)
            if not char or not char.alive:
                continue

            # Try to accept an existing offer first
            accepted = self._try_accept_offer(char, sim)
            if accepted:
                events.append(accepted)
            else:
                # Post a new offer
                posted = self._create_offer(char, sim)
                if posted:
                    events.append(posted)

        # Expire old offers
        self._expire_offers(sim)

        # Update price index based on recent trades
        self._update_price_index(sim)

        return events

    def _create_offer(self, char: Character, sim: SimulationState) -> Event | None:
        """Character posts a trade offer based on their surplus/deficit."""
        rng = random.Random(hash(("trade_offer", char.id, sim.tick)))

        # Find surplus (highest resource) and deficit (lowest resource)
        resources = char.resources
        if not resources:
            return None

        sorted_res = sorted(resources.items(), key=lambda x: x[1])
        deficit_name, deficit_val = sorted_res[0]
        surplus_name, surplus_val = sorted_res[-1]

        if surplus_name == deficit_name or surplus_val < 10:
            return None

        offer_amount = round(surplus_val * 0.15, 1)
        # Request amount adjusted by trade skill
        request_amount = round(offer_amount * (1.0 + (1.0 - char.trade_skill) * 0.3), 1)

        offer = TradeOffer(
            seller_id=char.id,
            offer_resource=surplus_name,
            offer_amount=offer_amount,
            request_resource=deficit_name,
            request_amount=request_amount,
            created_tick=sim.tick,
            expires_tick=sim.tick + 10,
        )
        sim.market.offers.append(offer)

        return Event(
            tick=sim.tick, type=EventType.TRADE_POSTED,
            title=f"{char.name} posts trade offer",
            description=f"{char.name} offers {offer_amount:.0f} {surplus_name} for {request_amount:.0f} {deficit_name}.",
            participants=[char.id],
            outcomes=[f"Trade offer posted at the market"],
            importance=0.3,
        )

    def _try_accept_offer(self, buyer: Character, sim: SimulationState) -> Event | None:
        """Evaluate open offers and accept the best one."""
        best_offer = None
        best_score = 0

        for offer in sim.market.offers:
            if offer.status != "open" or offer.seller_id == buyer.id:
                continue
            seller = sim.characters.get(offer.seller_id)
            if not seller or not seller.alive:
                continue

            score = self._evaluate_offer(buyer, offer, sim)
            if score > best_score and score > 0.4:
                best_score = score
                best_offer = offer

        if not best_offer:
            return None

        # Check buyer can afford it
        buyer_res = buyer.resources.get(best_offer.request_resource, 0)
        if buyer_res < best_offer.request_amount:
            return None

        seller = sim.characters[best_offer.seller_id]

        # Execute trade
        buyer.resources[best_offer.request_resource] = buyer_res - best_offer.request_amount
        buyer.resources[best_offer.offer_resource] = buyer.resources.get(best_offer.offer_resource, 0) + best_offer.offer_amount
        seller.resources[best_offer.offer_resource] = max(0, seller.resources.get(best_offer.offer_resource, 0) - best_offer.offer_amount)
        seller.resources[best_offer.request_resource] = seller.resources.get(best_offer.request_resource, 0) + best_offer.request_amount

        # Update offer status
        best_offer.status = "accepted"
        best_offer.accepted_by = buyer.id

        # Record history
        sim.market.history.append(TradeHistory(
            tick=sim.tick,
            seller_id=seller.id,
            buyer_id=buyer.id,
            sold_resource=best_offer.offer_resource,
            sold_amount=best_offer.offer_amount,
            bought_resource=best_offer.request_resource,
            bought_amount=best_offer.request_amount,
        ))

        # Improve relationship
        buyer.relationships[seller.id] = min(1, buyer.relationships.get(seller.id, 0) + 0.1)
        seller.relationships[buyer.id] = min(1, seller.relationships.get(buyer.id, 0) + 0.1)

        # Improve trade skill
        buyer.trade_skill = min(1.0, buyer.trade_skill + 0.01)
        seller.trade_skill = min(1.0, seller.trade_skill + 0.01)

        return Event(
            tick=sim.tick, type=EventType.TRADE_COMPLETED,
            title=f"Trade: {seller.name} and {buyer.name}",
            description=f"{buyer.name} traded {best_offer.request_amount:.0f} {best_offer.request_resource} "
                        f"for {best_offer.offer_amount:.0f} {best_offer.offer_resource} from {seller.name}.",
            participants=[seller.id, buyer.id],
            outcomes=[f"Both parties benefit from the exchange"],
            importance=0.5,
        )

    def _evaluate_offer(self, buyer: Character, offer: TradeOffer, sim: SimulationState) -> float:
        """Score 0-1 how desirable this trade is for the buyer."""
        # How much do they need what's being offered?
        current_offered = buyer.resources.get(offer.offer_resource, 0)
        current_requested = buyer.resources.get(offer.request_resource, 0)

        need_score = max(0, (50 - current_offered) / 50)  # Higher need = higher score
        afford_score = min(1, current_requested / max(1, offer.request_amount))

        # Personality modifiers
        agree_bonus = buyer.traits.agreeableness * 0.2  # Agreeable chars accept more
        consc_bonus = buyer.traits.conscientiousness * 0.1  # Conscientious chars evaluate carefully

        # Price fairness based on market prices
        prices = sim.market.price_index
        offered_value = offer.offer_amount * prices.get(offer.offer_resource, 1)
        requested_value = offer.request_amount * prices.get(offer.request_resource, 1)
        fairness = offered_value / max(0.1, requested_value)
        fairness_score = min(1, fairness)

        return (need_score * 0.4 + afford_score * 0.2 + fairness_score * 0.3 + agree_bonus + consc_bonus) * buyer.trade_skill

    def _expire_offers(self, sim: SimulationState):
        for offer in sim.market.offers:
            if offer.status == "open" and sim.tick >= offer.expires_tick:
                offer.status = "expired"
        # Prune closed offers to prevent unbounded list growth
        if len(sim.market.offers) > 200:
            sim.market.offers = [o for o in sim.market.offers if o.status == "open"]

    def _update_price_index(self, sim: SimulationState):
        """Adjust prices based on recent supply/demand."""
        # Only scan recent history (use reversed walk for efficiency)
        cutoff = sim.tick - 20
        recent = []
        for h in reversed(sim.market.history):
            if h.tick < cutoff:
                break
            recent.append(h)
        if not recent:
            return

        demand: dict[str, float] = {}
        supply: dict[str, float] = {}

        for trade in recent:
            demand[trade.bought_resource] = demand.get(trade.bought_resource, 0) + trade.bought_amount
            supply[trade.sold_resource] = supply.get(trade.sold_resource, 0) + trade.sold_amount

        for resource in sim.market.price_index:
            d = demand.get(resource, 0)
            s = supply.get(resource, 0)
            if s > 0:
                ratio = d / s
                # Move price toward supply/demand ratio
                current = sim.market.price_index[resource]
                sim.market.price_index[resource] = current * 0.9 + ratio * 0.1

        # Cap history to prevent unbounded growth
        if len(sim.market.history) > 500:
            sim.market.history = sim.market.history[-200:]
