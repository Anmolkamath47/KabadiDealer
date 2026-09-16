import React from 'react';
import {
  DealerNavigationMap,
  DealerNavigationMapProps,
} from './DealerNavigationMap';

export type DealerLiveMapProps = DealerNavigationMapProps;

/**
 * DealerLiveMap is now powered by DealerNavigationMap,
 * delivering authentic Google Maps Turn-by-Turn Navigation
 * to the customer's doorstep with voice guidance, maneuver HUD,
 * and 1-tap Google Maps native launch.
 */
export const DealerLiveMap: React.FC<DealerLiveMapProps> = (props) => {
  return <DealerNavigationMap {...props} />;
};
