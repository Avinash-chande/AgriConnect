import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Plus, Minus, Navigation, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './mapConfig';

export interface MapControlsProps {
  onLocateMe?: () => void;
  showFullscreen?: boolean;
  showLocateMe?: boolean;
  showReset?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onLocateMe,
  showFullscreen = true,
  showLocateMe = true,
  showReset = true,
  containerRef,
  className = '',
}) => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetView = () => {
    map.flyTo(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { duration: 1 });
  };

  const handleLocateMe = () => {
    if (onLocateMe) {
      onLocateMe();
    } else {
      map.locate({ setView: true, maxZoom: 14 });
    }
  };

  const toggleFullscreen = async () => {
    try {
      const targetElement = containerRef?.current || map.getContainer().parentElement || map.getContainer();
      if (!document.fullscreenElement) {
        if (targetElement.requestFullscreen) {
          await targetElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen mode not supported or allowed by browser:', err);
    }
  };

  return (
    <div className={`absolute bottom-4 right-4 z-[1000] flex flex-col space-y-2 select-none ${className}`}>
      {/* Zoom Controls */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col divide-y divide-slate-100">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 transition-colors focus:outline-none focus:bg-emerald-50 active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 transition-colors focus:outline-none focus:bg-emerald-50 active:scale-95"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Locate Me Button */}
      {showLocateMe && (
        <button
          type="button"
          onClick={handleLocateMe}
          title="Center on My GPS Location"
          className="bg-white/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-lg text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition-all focus:outline-none active:scale-95"
        >
          <Navigation className="w-4 h-4 text-emerald-600" />
        </button>
      )}

      {/* Reset View Button */}
      {showReset && (
        <button
          type="button"
          onClick={handleResetView}
          title="Reset Map View"
          className="bg-white/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-lg text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition-all focus:outline-none active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      {/* Fullscreen Toggle */}
      {showFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
          className="bg-white/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 shadow-lg text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition-all focus:outline-none active:scale-95"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
