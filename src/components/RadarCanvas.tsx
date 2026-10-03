import React, { useRef, useEffect } from 'react';
import type { TrackSensorData, EntityState, TerrainType, TimeOfDay, WeatherCondition } from '../types';
import type { SensorSystemState } from '../sim/sensors';

interface RadarCanvasProps {
  tracks: Map<string, TrackSensorData>;
  entities?: EntityState[]; // Ground truth for replay or instructor view
  sensorState: SensorSystemState;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  terrain: TerrainType;
  timeOfDay: TimeOfDay;
  weather: WeatherCondition;
  isReplayMode?: boolean;
  assetHealth: number;
  width?: number;
  height?: number;
}

export const RadarCanvas: React.FC<RadarCanvasProps> = ({
  tracks,
  entities,
  sensorState,
  selectedTrackId,
  onSelectTrack,
  terrain,
  timeOfDay,
  weather,
  isReplayMode = false,
  assetHealth,
  width = 750,
  height = 750,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Maximum radar display radius in meters
  const MAX_RADIUS = 3500;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (width / 2 - 30) / MAX_RADIUS; // pixels per meter

  // Convert sim meters (x, y) to canvas pixels
  const toCanvasCoords = (x: number, y: number) => {
    return {
      cx: centerX + x * scale,
      cy: centerY - y * scale, // Canvas Y is inverted
    };
  };

  // Canvas click handler to pick track
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let closestTrackId: string | null = null;
    let minDistance = 25; // 25px click radius

    tracks.forEach((track, trackId) => {
      const { cx, cy } = toCanvasCoords(track.estimatedX, track.estimatedY);
      const dist = Math.hypot(clickX - cx, clickY - cy);
      if (dist < minDistance) {
        minDistance = dist;
        closestTrackId = trackId;
      }
    });

    if (closestTrackId) {
      onSelectTrack(closestTrackId);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = timeOfDay === 'night' ? '#040906' : '#07120b';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Urban Buildings / Terrain shadows
    if (terrain === 'urban') {
      ctx.fillStyle = 'rgba(20, 35, 25, 0.45)';
      ctx.strokeStyle = 'rgba(34, 70, 48, 0.6)';
      ctx.lineWidth = 1.5;

      const buildings = [
        { x: -1600, y: 800, w: 600, h: 400 },
        { x: 900, y: -1800, w: 500, h: 700 },
        { x: -1200, y: -1400, w: 450, h: 450 },
        { x: 1100, y: 1200, w: 500, h: 500 },
      ];

      buildings.forEach((b) => {
        const { cx, cy } = toCanvasCoords(b.x, b.y);
        const bw = b.w * scale;
        const bh = b.h * scale;
        ctx.fillRect(cx, cy - bh, bw, bh);
        ctx.strokeRect(cx, cy - bh, bw, bh);
      });
    }

    // 2. Draw Range Rings & Compass Grids
    const ranges = [500, 1000, 2000, 3000];
    ctx.lineWidth = 1;

    ranges.forEach((r) => {
      const rPx = r * scale;
      ctx.beginPath();
      ctx.arc(centerX, centerY, rPx, 0, Math.PI * 2);
      ctx.strokeStyle = r === 500 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.25)';
      ctx.stroke();

      // Range text labels
      ctx.fillStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.font = '10px monospace';
      ctx.fillText(`${r}m`, centerX + 5, centerY - rPx + 12);
    });

    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, height - 15);
    ctx.moveTo(15, centerY);
    ctx.lineTo(width - 15, centerY);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.stroke();

    // Cardinal directions
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('N 000°', centerX - 18, 22);
    ctx.fillText('S 180°', centerX - 18, height - 10);
    ctx.fillText('E 090°', width - 42, centerY + 4);
    ctx.fillText('W 270°', 6, centerY + 4);

    // 3. Draw EO/IR Camera FOV Cone
    if (sensorState.eoIrActive) {
      const slewRad = (sensorState.eoirSlewAngle * Math.PI) / 180;
      const fovRad = (sensorState.eoirFov * Math.PI) / 180;
      const startAngle = slewRad - fovRad / 2;
      const endAngle = slewRad + fovRad / 2;
      const coneRangePx = 1200 * scale;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      // Note: Canvas arc 0 deg is right (East), positive angles clockwise. In math Y is up, Canvas Y is down.
      // Mathematical bearing 0° is North (up). Convert bearing to Canvas angle: angle = bearing - 90 deg
      const canvasStart = startAngle - Math.PI / 2;
      const canvasEnd = endAngle - Math.PI / 2;
      ctx.arc(centerX, centerY, coneRangePx, canvasStart, canvasEnd);
      ctx.closePath();

      const eoGradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, coneRangePx);
      eoGradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      eoGradient.addColorStop(1, 'rgba(6, 182, 212, 0.03)');
      ctx.fillStyle = eoGradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.stroke();
    }

    // 4. Draw Rotating Radar Sweep Line
    if (sensorState.radarActive) {
      const sweepRad = (sensorState.radarSweepAngle * Math.PI) / 180 - Math.PI / 2;
      const maxPx = MAX_RADIUS * scale;

      // Sweep gradient sector trailing behind sweep angle
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxPx, sweepRad - Math.PI / 6, sweepRad);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxPx);
      sweepGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
      sweepGrad.addColorStop(1, 'rgba(16, 185, 129, 0.02)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Main sweep line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(sweepRad) * maxPx, centerY + Math.sin(sweepRad) * maxPx);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Ground Truth overlay (if Replay Mode)
    if (isReplayMode && entities) {
      entities.forEach((entity) => {
        if (!entity.active && entity.status !== 'impacted') return;
        const { cx, cy } = toCanvasCoords(entity.x, entity.y);

        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = entity.trueType.startsWith('hostile') ? '#ef4444' : entity.trueType === 'friendly' ? '#3b82f6' : '#f59e0b';
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '9px monospace';
        ctx.fillText(`TRUE: ${entity.trueType.toUpperCase()}`, cx + 8, cy - 6);
      });
    }

    // 6. Draw Detected Track Blips
    tracks.forEach((track, trackId) => {
      const { cx, cy } = toCanvasCoords(track.estimatedX, track.estimatedY);
      const isSelected = trackId === selectedTrackId;
      const isUnack = !track.userAcknowledged;

      // Draw blip marker
      ctx.beginPath();
      ctx.arc(cx, cy, isSelected ? 7 : 5, 0, Math.PI * 2);

      let blipColor = '#10b981'; // Green standard radar
      if (track.userClassification === 'hostile_attack' || track.userClassification === 'swarm') {
        blipColor = '#ef4444'; // Red hostile
      } else if (track.userClassification === 'hostile_recon') {
        blipColor = '#f97316'; // Amber recon
      } else if (track.userClassification === 'friendly') {
        blipColor = '#3b82f6'; // Blue friendly
      } else if (track.userClassification === 'civilian' || track.userClassification === 'bird') {
        blipColor = '#eab308'; // Yellow decoy
      }

      ctx.fillStyle = blipColor;
      ctx.fill();

      // Pulsing alert ring for unacknowledged tracks
      if (isUnack) {
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Selected Target Reticle (Square brackets)
      if (isSelected) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        const s = 12;
        ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
      }

      // Track Tag Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(trackId, cx + 10, cy + 3);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '9px monospace';
      const statusText = `${track.estimatedDistance}m | ${track.userClassification.toUpperCase()}`;
      ctx.fillText(statusText, cx + 10, cy + 14);
    });

    // 7. Central Defended Asset Icon & Health Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
    ctx.fillStyle = assetHealth > 50 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.35)';
    ctx.fill();
    ctx.strokeStyle = assetHealth > 50 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Base icon cross
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('BASE ASSET', centerX - 28, centerY + 28);
  }, [tracks, entities, sensorState, selectedTrackId, terrain, timeOfDay, weather, isReplayMode, assetHealth, width, height]);

  return (
    <div className="radar-crt relative inline-block border-2 border-emerald-900/60 rounded-lg bg-black shadow-2xl overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="cursor-crosshair block"
      />
    </div>
  );
};
