import React from 'react';
import { DealerNavigationMap } from './DealerNavigationMap';
import { DrivingRouteResult } from '../../services/mapService';

interface DealerLiveMapProps {
  customerCoords?: [number, number]; // [lng, lat]
  customerAddress?: string;
  customerName?: string;
  dealerCoords?: [number, number]; // [lng, lat]
  vehicleType?: string;
  onSendLivePing?: (coords: [number, number]) => void;
  onRouteCalculated?: (route: DrivingRouteResult) => void;
}

export const DealerLiveMap: React.FC<DealerLiveMapProps> = (props) => {
  return <DealerNavigationMap {...props} />;
};

export { DealerNavigationMap };
