import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useTheme } from '../context/ThemeContext';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function HeatmapLayer({ complaints }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !complaints || complaints.length === 0) return;

    // Filter complaints that have coordinates (parseFloat handles pg numeric strings)
    const heatData = complaints
      .filter(c => c.lat && c.lng)
      .map(c => {
        // Higher intensity for higher priority
        let intensity = 0.5;
        if (c.priority === 'P1') intensity = 1.0;
        if (c.priority === 'P2') intensity = 0.8;
        return [parseFloat(c.lat), parseFloat(c.lng), intensity];
      })
      .filter(pt => !isNaN(pt[0]) && !isNaN(pt[1]));

    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 20,
      maxZoom: 13,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    // If we have points, center the map around them
    if (heatData.length > 0) {
      const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]]));
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 13 });
    }

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, complaints]);

  return null;
}

export default function HeatmapWidget({ complaints }) {
  const { theme } = useTheme();
  // Default center (Delhi, India)
  const [center] = useState([28.6139, 77.2090]);

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-body)', position: 'relative', zIndex: 1 }}>
      <MapContainer center={center} zoom={11} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url={theme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <HeatmapLayer complaints={complaints} />
      </MapContainer>
      
      <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', boxShadow: 'var(--shadow)', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Heatmap Density</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-mist)' }}>Low</span>
          <div style={{ width: '120px', height: '10px', background: 'linear-gradient(to right, blue, cyan, lime, yellow, red)', borderRadius: '5px' }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-mist)' }}>High</span>
        </div>
      </div>
    </div>
  );
}
