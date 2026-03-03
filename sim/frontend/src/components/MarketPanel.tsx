'use client';

import type { MarketState, Character } from '@/lib/types';

interface MarketPanelProps {
  market: MarketState;
  characters: Record<string, Character>;
}

export default function MarketPanel({ market, characters }: MarketPanelProps) {
  const openOffers = market.offers.filter(o => o.status === 'open');
  const recentHistory = [...market.history].reverse().slice(0, 20);

  return (
    <div className="pixel-panel flex flex-col h-full">
      <div className="pixel-panel-title flex items-center justify-between">
        <span>Market</span>
        <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>
          {openOffers.length} offers
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3 pixel-scrollbar">
        {/* Price Index */}
        <div>
          <div className="font-pixel text-neon-cyan uppercase mb-1" style={{ fontSize: '7px' }}>Prices</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(market.price_index).map(([res, price]) => (
              <span
                key={res}
                className="pixel-badge font-pixel"
                style={{ fontSize: '6px', borderColor: '#ffd700', color: '#ffd700' }}
              >
                {res}: {price.toFixed(1)}
              </span>
            ))}
          </div>
        </div>

        {/* Open Offers */}
        <div>
          <div className="font-pixel text-neon-cyan uppercase mb-1" style={{ fontSize: '7px' }}>Open Offers</div>
          {openOffers.length === 0 ? (
            <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No open offers</div>
          ) : (
            <div className="space-y-1">
              {openOffers.map(offer => {
                const seller = characters[offer.seller_id];
                return (
                  <div
                    key={offer.id}
                    className="p-1.5"
                    style={{ background: '#0a0a1a', border: '1px solid #ccaa44' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-pixel-text truncate" style={{ fontSize: '7px' }}>
                        {seller?.name || '?'}
                      </span>
                      <span className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                        T{offer.created_tick}
                      </span>
                    </div>
                    <div className="font-pixel mt-1" style={{ fontSize: '7px', color: '#ffcc00' }}>
                      {offer.offer_amount.toFixed(0)} {offer.offer_resource} → {offer.request_amount.toFixed(0)} {offer.request_resource}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trade History */}
        <div>
          <div className="font-pixel text-neon-cyan uppercase mb-1" style={{ fontSize: '7px' }}>Recent Trades</div>
          {recentHistory.length === 0 ? (
            <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '7px' }}>No trades yet</div>
          ) : (
            <div className="space-y-1">
              {recentHistory.map(trade => {
                const seller = characters[trade.seller_id];
                const buyer = characters[trade.buyer_id];
                return (
                  <div
                    key={trade.id}
                    className="p-1.5"
                    style={{ background: '#0a0a1a', border: '1px solid #2a2a5a' }}
                  >
                    <div className="font-pixel text-pixel-text-dim" style={{ fontSize: '6px' }}>
                      T{trade.tick}: {seller?.name || '?'} → {buyer?.name || '?'}
                    </div>
                    <div className="font-pixel" style={{ fontSize: '7px', color: '#88cc44' }}>
                      {trade.sold_amount.toFixed(0)} {trade.sold_resource} for {trade.bought_amount.toFixed(0)} {trade.bought_resource}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
