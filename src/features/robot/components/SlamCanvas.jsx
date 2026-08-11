/**
 * SlamCanvas.jsx - 2D SLAM Map Canvas Component
 * 
 * Hiển thị bản đồ OccupancyGrid từ ROS 2 và vị trí robot real-time
 * Giống như RViz nhưng trên web với hiệu ứng mượt 60fps
 * 
 * @author SmartMarketBot Team
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';

/**
 * Component vẽ bản đồ SLAM 2D từ ROS OccupancyGrid
 */
export function SlamCanvas({
  rosMapData,
  robotPose,
  laserScan,
  scale = 64,
  showLaserPoints = true,
  showRobot = true,
  showGrid = true,
  className = '',
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const smoothedPoseRef = useRef({ x: 0, y: 0, yaw: 0 });

  // Smooth pose interpolation for 60fps animation
  useEffect(() => {
    if (!robotPose) return;

    const target = {
      x: robotPose.position?.x || 0,
      y: robotPose.position?.y || 0,
      yaw: robotPose.orientation?.yaw || 0,
    };

    // Lerp factor - adjust for smoothness (0.1 = snappy, 0.3 = smooth)
    const lerpFactor = 0.2;

    smoothedPoseRef.current = {
      x: smoothedPoseRef.current.x + (target.x - smoothedPoseRef.current.x) * lerpFactor,
      y: smoothedPoseRef.current.y + (target.y - smoothedPoseRef.current.y) * lerpFactor,
      yaw: smoothedPoseRef.current.yaw + (target.yaw - smoothedPoseRef.current.yaw) * lerpFactor,
    };
  }, [robotPose]);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, height);

    // Calculate transform to center map
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw grid background
    if (showGrid) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.5;
      const gridSize = scale / 4; // Quarter meter grid
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw OccupancyGrid map if available
    if (rosMapData?.data && rosMapData.info?.width > 0) {
      const { info, data } = rosMapData;
      const mapWidth = info.width;
      const mapHeight = info.height;
      const resolution = info.resolution;
      const origin = info.origin;

      // Calculate map bounds in ROS coordinates
      const mapOriginX = origin.position.x;
      const mapOriginY = origin.position.y;

      // Draw map cells
      const cellSize = Math.max(1, scale * resolution);

      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const idx = y * mapWidth + x;
          const value = data[idx];

          if (value === -1) {
            // Unknown - gray
            ctx.fillStyle = '#64748b40';
          } else if (value === 0) {
            // Free space - white/transparent
            ctx.fillStyle = '#ffffff08';
          } else if (value >= 100) {
            // Wall/obstacle - black
            ctx.fillStyle = '#1e293b';
          } else {
            // Probability gradient
            const intensity = value / 100;
            const gray = Math.round(255 - intensity * 200);
            ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
          }

          // Convert grid index to canvas coordinates
          // ROS map: origin at bottom-left, y increases upward
          // Canvas: origin at top-left, y increases downward
          const rosX = mapOriginX + x * resolution;
          const rosY = mapOriginY + (mapHeight - 1 - y) * resolution;

          const canvasX = centerX + rosX * scale;
          const canvasY = centerY - rosY * scale;

          ctx.fillRect(canvasX, canvasY, cellSize, cellSize);
        }
      }
    }

    // Draw robot position
    if (showRobot && smoothedPoseRef.current) {
      const { x, y, yaw } = smoothedPoseRef.current;
      const robotX = centerX + x * scale;
      const robotY = centerY - y * scale;

      ctx.save();
      ctx.translate(robotX, robotY);
      ctx.rotate(-yaw); // Negative because canvas y is inverted

      // Robot body (circle)
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Direction arrow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -18);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(-4, -12);
      ctx.lineTo(0, -20);
      ctx.lineTo(4, -12);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }

    // Draw laser scan points
    if (showLaserPoints && laserScan?.points && laserScan.points.length > 0) {
      const { x: robotX, y: robotY, yaw: robotYaw } = smoothedPoseRef.current;
      const baseX = centerX + robotX * scale;
      const baseY = centerY - robotY * scale;

      ctx.save();
      ctx.translate(baseX, baseY);
      ctx.rotate(-robotYaw);

      // Draw laser rays
      ctx.beginPath();
      laserScan.points.forEach((point, i) => {
        const px = point.x * scale;
        const py = -point.y * scale;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });

      // Gradient fill for laser scan area
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
      gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Laser points
      ctx.beginPath();
      laserScan.points.forEach((point) => {
        const px = point.x * scale;
        const py = -point.y * scale;
        ctx.moveTo(px + 1, py);
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      });
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      ctx.restore();
    }

    // Request next frame
    animationRef.current = requestAnimationFrame(draw);
  }, [rosMapData, showLaserPoints, showRobot, showGrid, scale]);

  // Start animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
      }
    });

    resizeObserver.observe(canvas.parentElement);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

/**
 * Mini SLAM display for robot telemetry panel
 */
export function SlamMinimap({
  rosMapData,
  robotPose,
  laserScan,
  size = 200,
}) {
  const canvasRef = useRef(null);
  const smoothedPoseRef = useRef({ x: 0, y: 0, yaw: 0 });

  useEffect(() => {
    if (robotPose) {
      const target = {
        x: robotPose.position?.x || 0,
        y: robotPose.position?.y || 0,
        yaw: robotPose.orientation?.yaw || 0,
      };
      const lerpFactor = 0.25;
      smoothedPoseRef.current = {
        x: smoothedPoseRef.current.x + (target.x - smoothedPoseRef.current.x) * lerpFactor,
        y: smoothedPoseRef.current.y + (target.y - smoothedPoseRef.current.y) * lerpFactor,
        yaw: smoothedPoseRef.current.yaw + (target.yaw - smoothedPoseRef.current.yaw) * lerpFactor,
      };
    }
  }, [robotPose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const ctxScale = size / 10; // 10m x 10m view

    const draw = () => {
      // Clear
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;

      // Draw map
      if (rosMapData?.data) {
        const { info, data } = rosMapData;
        const { width, height, resolution } = info;

        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            const idx = y * width + x;
            const value = data[idx];

            if (value === -1) continue;
            if (value === 0) continue;

            const rosX = x * resolution - 5;
            const rosY = y * resolution - 5;

            const px = centerX + rosX * ctxScale;
            const py = centerY - rosY * ctxScale;

            ctx.fillStyle = value >= 80 ? '#334155' : '#475569';
            ctx.fillRect(px, py, 2, 2);
          }
        }
      }

      // Draw robot
      const { x, y, yaw } = smoothedPoseRef.current;
      const rx = centerX + x * ctxScale;
      const ry = centerY - y * ctxScale;

      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(-yaw);

      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -10);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Draw laser
      if (laserScan?.points) {
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(-yaw);

        ctx.beginPath();
        laserScan.points.forEach((p) => {
          const px = p.x * ctxScale;
          const py = -p.y * ctxScale;
          ctx.moveTo(px + 1, py);
          ctx.arc(px, py, 1, 0, Math.PI * 2);
        });
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        ctx.restore();
      }

      requestAnimationFrame(draw);
    };

    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [rosMapData, laserScan, size]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block"
      />
      <div className="absolute bottom-1 left-1 text-[8px] text-slate-400 font-mono">
        SLAM
      </div>
    </div>
  );
}

export default SlamCanvas;
