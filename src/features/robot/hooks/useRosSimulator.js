/**
 * useRosSimulator.js - Mock ROS 2 Connection for Demo
 * 
 * Giả lập dữ liệu ROS khi không có robot thật kết nối
 * Dùng để demo DEMO 1 mà không cần Pi 5
 * 
 * @author SmartMarketBot Team
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// MOCK DATA GENERATORS
// ============================================================

function generateMockMap() {
  const width = 200;
  const height = 150;
  const resolution = 0.05;
  
  const data = new Array(width * height).fill(0);
  
  // Draw walls (obstacles)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      
      // Border walls
      if (x < 3 || x >= width - 3 || y < 3 || y >= height - 3) {
        data[idx] = 100; // Wall
      }
      // Shelf obstacles (grid pattern)
      else if ((x % 20 >= 8 && x % 20 < 12) && (y % 15 >= 4 && y % 15 < 11)) {
        data[idx] = 100; // Shelf
      }
      // Aisle walls
      else if ((y % 30 >= 12 && y % 30 < 14) && (x > 10 && x < width - 10)) {
        data[idx] = 80;
      }
      // Free space
      else {
        data[idx] = 0;
      }
    }
  }
  
  return {
    header: {
      stamp: { sec: Math.floor(Date.now() / 1000), nanosec: 0 },
      frame_id: 'map',
    },
    info: {
      width,
      height,
      resolution,
      origin: {
        position: { x: -5, y: -3.75, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
      },
    },
    data,
    timestamp: Date.now(),
  };
}

function generateMockOdometry(time) {
  // Simulate robot moving in a figure-8 pattern
  const t = time / 2000;
  const x = Math.sin(t) * 2; // -2 to 2 meters
  const y = Math.sin(t * 2) * 1; // -1 to 1 meters
  const yaw = Math.cos(t) * Math.PI / 4; // -45 to 45 degrees
  
  return {
    header: {
      stamp: { sec: Math.floor(time / 1000), nanosec: (time % 1000) * 1000000 },
      frame_id: 'odom',
      child_frame_id: 'base_link',
    },
    pose: {
      pose: {
        position: { x, y, z: 0 },
        orientation: {
          x: 0,
          y: 0,
          z: Math.sin(yaw / 2),
          w: Math.cos(yaw / 2),
        },
      },
    },
    timestamp: time,
  };
}

function generateMockLaserScan(time) {
  const angle_min = -Math.PI;
  const angle_max = Math.PI;
  const angle_increment = 0.017453292519943295; // 1 degree
  const ranges = [];
  
  const numReadings = Math.floor((angle_max - angle_min) / angle_increment);
  
  for (let i = 0; i < numReadings; i++) {
    const angle = angle_min + i * angle_increment;
    
    // Simulate walls at different distances
    let range = 10; // Max range
    
    // Wall at ~1.5m
    if (angle > -0.5 && angle < 0.5) {
      range = 1.5 + Math.sin(angle * 10 + time / 500) * 0.1;
    }
    // Wall at ~2m
    if (angle > 1.5 || angle < -1.5) {
      range = 2.0;
    }
    // Random obstacles
    if (Math.random() > 0.98) {
      range = 0.5 + Math.random() * 0.5;
    }
    
    ranges.push(range);
  }
  
  return {
    header: {
      stamp: { sec: Math.floor(time / 1000), nanosec: (time % 1000) * 1000000 },
      frame_id: 'laser_frame',
    },
    angle_min,
    angle_max,
    angle_increment,
    range_min: 0.1,
    range_max: 10,
    ranges,
    points: ranges.map((range, i) => {
      const angle = angle_min + i * angle_increment;
      return {
        angle,
        angleDeg: (angle * 180) / Math.PI,
        range,
        x: range * Math.cos(angle),
        y: range * Math.sin(angle),
      };
    }).filter(p => p.range > 0.1 && p.range < 10),
    pointCount: ranges.length,
    timestamp: time,
  };
}

// ============================================================
// CUSTOM HOOK
// ============================================================

export function useRosSimulator({ enabled = false, robotIp = '192.168.69.226' } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [rosMapData, setRosMapData] = useState(null);
  const [robotPose, setRobotPose] = useState(null);
  const [laserScan, setLaserScan] = useState(null);
  const [tfData, setTfData] = useState(null);
  
  const animationRef = useRef(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Simulate connection with delay
  useEffect(() => {
    if (!enabled) {
      setIsConnected(false);
      setConnectionState('disconnected');
      setRosMapData(null);
      setRobotPose(null);
      setLaserScan(null);
      return;
    }

    setConnectionState('connecting');
    
    // Simulate connection delay
    const connectTimeout = setTimeout(() => {
      setIsConnected(true);
      setConnectionState('connected');
      startTimeRef.current = Date.now();
      
      // Generate initial map
      setRosMapData(generateMockMap());
      
      // Start data generation loops
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        
        // Update odometry at ~10Hz
        const odom = generateMockOdometry(elapsed);
        setRobotPose({
          ...odom,
          position: odom.pose.pose.position,
          orientation: {
            ...odom.pose.pose.orientation,
            yaw: Math.atan2(
              2 * (odom.pose.pose.orientation.w * odom.pose.pose.orientation.z + 
                   odom.pose.pose.orientation.x * odom.pose.pose.orientation.y),
              1 - 2 * (odom.pose.pose.orientation.y ** 2 + odom.pose.pose.orientation.z ** 2)
            ),
            yawDeg: (Math.atan2(
              2 * (odom.pose.pose.orientation.w * odom.pose.pose.orientation.z + 
                   odom.pose.pose.orientation.x * odom.pose.pose.orientation.y),
              1 - 2 * (odom.pose.pose.orientation.y ** 2 + odom.pose.pose.orientation.z ** 2)
            ) * 180) / Math.PI,
          },
          source: 'simulator',
        });
        
        // Update laser scan at ~15Hz
        if (Math.random() > 0.4) {
          setLaserScan(generateMockLaserScan(elapsed));
        }
        
      }, 66); // ~15Hz update rate
      
    }, 1500); // 1.5s connection simulation

    return () => {
      clearTimeout(connectTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  const connect = useCallback(() => {
    setConnectionState('connecting');
    setTimeout(() => {
      setIsConnected(true);
      setConnectionState('connected');
    }, 1500);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setConnectionState('disconnected');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 500);
  }, [connect, disconnect]);

  return {
    // Connection State
    isConnected,
    connectionState,
    error: null,
    reconnectAttempt: 0,
    robotIp,
    port: 8765,

    // ROS Data
    rosMapData,
    robotPose,
    laserScan,
    tfData,

    // Connection Methods
    connect,
    disconnect,
    reconnect,

    // Utilities
    connectionUrl: `ws://${robotIp}:8765 (SIMULATED)`,
    subscribedTopics: ['/map', '/odom', '/scan', '/tf'],
    isSimulator: true,
  };
}

export default useRosSimulator;
