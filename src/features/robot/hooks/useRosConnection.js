/**
 * useRosConnection.js - Custom Hook for ROS 2 Foxglove Bridge Connection
 *
 * Kết nối WebSocket trực tiếp tới ROS 2 robot qua foxglove_bridge.
 * Subscribe vào các topic: /map, /tf, /odom, /scan
 *
 * @author SmartMarketBot Team
 * @version 1.1.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// CONSTANTS & TYPES
// ============================================================

const DEFAULT_CONFIG = {
  ROBOT_IP: '192.168.0.105',
  FOXGLOVE_PORT: 8765,
  RECONNECT_INTERVAL_MS: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,
  TELEMETRY_RATE_HZ: 10,
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Convert quaternion to Euler angles (yaw)
 */
function quaternionToYaw(qx, qy, qz, qw) {
  const siny_cosp = 2 * (qw * qz + qx * qy);
  const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
  return Math.atan2(siny_cosp, cosy_cosp);
}

/**
 * Parse OccupancyGrid message from JSON
 * @param {Object} msg - Parsed JSON message
 * @returns {Object|null} Parsed grid data
 */
function parseOccupancyGrid(msg) {
  try {
    if (!msg || !msg.data) return null;

    return {
      header: {
        stamp: msg.header?.stamp || { sec: 0, nanosec: 0 },
        frame_id: msg.header?.frame_id || 'map',
      },
      info: {
        width: msg.info?.width || 0,
        height: msg.info?.height || 0,
        resolution: msg.info?.resolution || 0.05,
        origin: {
          position: msg.info?.origin?.position || { x: 0, y: 0, z: 0 },
          orientation: msg.info?.origin?.orientation || { x: 0, y: 0, z: 0, w: 1 },
        },
      },
      data: Array.isArray(msg.data) ? msg.data : [],
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('[ROS] Failed to parse OccupancyGrid:', error);
    return null;
  }
}

/**
 * Parse Odometry message from JSON
 * @param {Object} msg - Parsed JSON message
 * @returns {Object|null} Parsed pose data
 */
function parseOdometry(msg) {
  try {
    if (!msg || !msg.pose) return null;

    const pose = msg.pose?.pose;
    if (!pose) return null;

    const position = pose.position || {};
    const orientation = pose.orientation || {};

    const qx = orientation.x || 0;
    const qy = orientation.y || 0;
    const qz = orientation.z || 0;
    const qw = orientation.w || 1;
    const yaw = quaternionToYaw(qx, qy, qz, qw);

    return {
      header: {
        stamp: msg.header?.stamp || { sec: 0, nanosec: 0 },
        frame_id: msg.header?.frame_id || 'odom',
        child_frame_id: msg.child_frame_id || 'base_link',
      },
      position: {
        x: position.x || 0,
        y: position.y || 0,
        z: position.z || 0,
      },
      orientation: {
        x: qx,
        y: qy,
        z: qz,
        w: qw,
        yaw: yaw,
        yawDeg: (yaw * 180) / Math.PI,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('[ROS] Failed to parse Odometry:', error);
    return null;
  }
}

/**
 * Parse LaserScan message from JSON
 * @param {Object} msg - Parsed JSON message
 * @returns {Object|null} Parsed laser scan data
 */
function parseLaserScan(msg) {
  try {
    if (!msg || !msg.ranges) return null;

    const angle_min = msg.angle_min || 0;
    const angle_increment = msg.angle_increment || 0.017453292519943295;
    const range_min = msg.range_min || 0;
    const range_max = msg.range_max || 10;
    const ranges = msg.ranges || [];

    // Convert polar to cartesian (relative to robot)
    const points = [];
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (range >= range_min && range <= range_max && isFinite(range)) {
        const angle = angle_min + i * angle_increment;
        points.push({
          angle: angle,
          angleDeg: (angle * 180) / Math.PI,
          range: range,
          x: range * Math.cos(angle),
          y: range * Math.sin(angle),
        });
      }
    }

    return {
      header: {
        stamp: msg.header?.stamp || { sec: 0, nanosec: 0 },
        frame_id: msg.header?.frame_id || 'laser_frame',
      },
      angle_min: angle_min,
      angle_max: msg.angle_max || angle_min + ranges.length * angle_increment,
      angle_increment: angle_increment,
      range_min: range_min,
      range_max: range_max,
      ranges: ranges,
      points: points,
      pointCount: points.length,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('[ROS] Failed to parse LaserScan:', error);
    return null;
  }
}

/**
 * Parse TF message to get robot transform
 * @param {Object} msg - TF message
 * @returns {Object|null} Transform data
 */
function parseTFMessage(msg) {
  try {
    if (!msg || !msg.transforms || msg.transforms.length === 0) return null;

    // Find base_link transform
    const transform = msg.transforms.find(
      (t) => t.child_frame_id === 'base_link' || t.child_frame_id === 'base_footprint'
    );

    if (!transform) return null;

    const t = transform.transform || {};
    const position = t.translation || {};
    const orientation = t.rotation || {};

    const qx = orientation.x || 0;
    const qy = orientation.y || 0;
    const qz = orientation.z || 0;
    const qw = orientation.w || 1;
    const yaw = quaternionToYaw(qx, qy, qz, qw);

    return {
      header: {
        stamp: transform.header?.stamp || { sec: 0, nanosec: 0 },
        frame_id: transform.header?.frame_id || 'map',
        child_frame_id: transform.child_frame_id,
      },
      position: {
        x: position.x || 0,
        y: position.y || 0,
        z: position.z || 0,
      },
      orientation: {
        x: qx,
        y: qy,
        z: qz,
        w: qw,
        yaw: yaw,
        yawDeg: (yaw * 180) / Math.PI,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('[ROS] Failed to parse TF:', error);
    return null;
  }
}

// ============================================================
// CUSTOM HOOK: useRosConnection
// ============================================================

/**
 * Custom hook để kết nối ROS 2 qua Foxglove Bridge WebSocket
 * 
 * @param {Object} options - Cấu hình kết nối
 * @param {string} options.robotIp - Địa chỉ IP của robot (default: 192.168.0.105)
 * @param {number} options.port - Port của Foxglove Bridge (default: 8765)
 * @param {boolean} options.autoConnect - Tự động kết nối khi mount (default: true)
 * @param {string[]} options.subscribeTopics - Danh sách topic cần subscribe (default: all)
 * @returns {Object} State và methods
 */
export function useRosConnection(options = {}) {
  const {
    robotIp = DEFAULT_CONFIG.ROBOT_IP,
    port = DEFAULT_CONFIG.FOXGLOVE_PORT,
    autoConnect = true,
    subscribeTopics = ['/map', '/odom', '/scan', '/tf'],
  } = options;

  // ============================================================
  // STATE
  // ============================================================
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected | connecting | connected | error | reconnecting
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ROS Data State
  const [rosMapData, setRosMapData] = useState(null);
  const [robotPose, setRobotPose] = useState(null);
  const [laserScan, setLaserScan] = useState(null);
  const [tfData, setTfData] = useState(null);

  // Refs for WebSocket and subscriptions
  const wsRef = useRef(null);
  const readerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscribedTopicsRef = useRef(new Set());
  const messageHandlersRef = useRef({});

  // ============================================================
  // MESSAGE HANDLERS
  // ============================================================

  const handleMessage = useCallback((channel, message) => {
    try {
      if (channel === 'message') {
        // Foxglove sends messages with topic metadata
        if (message.topic && message.data) {
          const topicName = message.topic;
          const data = message.data;

          // Auto-detect message type and parse
          switch (topicName) {
            case '/map':
              if (data instanceof Uint8Array) {
                // Try to parse as ROS message
                try {
                  const reader = new MessageReader(ROS_MESSAGE_TYPES.OCCUPANCY_GRID);
                  const parsed = parseOccupancyGrid(reader);
                  if (parsed) {
                    setRosMapData(parsed);
                  }
                } catch (e) {
                  // Fallback: raw data processing
                  console.debug('[ROS] Map data received (raw):', data.byteLength, 'bytes');
                }
              }
              break;

            case '/odom':
            case '/odometry/filtered':
            case '/odometry/raw':
              try {
                const parsed = parseOdometry(data);
                if (parsed) {
                  setRobotPose((prev) => ({
                    ...parsed,
                    source: topicName,
                  }));
                }
              } catch (e) {
                console.debug('[ROS] Odom parse fallback');
              }
              break;

            case '/scan':
            case '/scan_raw':
              try {
                const parsed = parseLaserScan(data);
                if (parsed) {
                  setLaserScan(parsed);
                }
              } catch (e) {
                console.debug('[ROS] Scan parse fallback');
              }
              break;

            case '/tf':
              try {
                const parsed = parseTFMessage(data);
                if (parsed) {
                  setTfData(parsed);
                  // Also update robot pose from TF if no odom
                  setRobotPose((prev) =>
                    prev?.source === 'tf'
                      ? { ...parsed, source: 'tf' }
                      : prev || { ...parsed, source: 'tf' }
                  );
                }
              } catch (e) {
                console.debug('[ROS] TF parse fallback');
              }
              break;

            default:
              // Log unknown topics once
              if (!messageHandlersRef.current[topicName]) {
                console.debug(`[ROS] Unknown topic received: ${topicName}`);
                messageHandlersRef.current[topicName] = true;
              }
          }
        }
      } else if (channel === 'connection') {
        console.log('[ROS] WebSocket connection event');
      }
    } catch (error) {
      console.warn('[ROS] Error handling message:', error);
    }
  }, []);

  // ============================================================
  // WEBSOCKET CONNECTION
  // ============================================================

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[ROS] Already connected');
      return;
    }

    const wsUrl = `ws://${robotIp}:${port}`;
    console.log(`[ROS] Connecting to ${wsUrl}...`);

    setConnectionState('connecting');
    setError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ROS] ✅ Connected to Foxglove Bridge');
        setIsConnected(true);
        setConnectionState('connected');
        setReconnectAttempt(0);
        setError(null);

        // Send subscribe messages for Foxglove Bridge protocol
        const topicsToSubscribe = subscribeTopics.filter(Boolean);
        topicsToSubscribe.forEach((topic) => {
          // Foxglove Bridge subscribe message
          const subscribeMsg = JSON.stringify({
            type: 'subscribe',
            topic: topic,
            throttle_ms: 100,
          });
          ws.send(subscribeMsg);
          subscribedTopicsRef.current.add(topic);
          console.log(`[ROS] Subscribed to: ${topic}`);
        });
      };

      ws.onmessage = (event) => {
        try {
          // Try parsing as JSON first (Foxglove Bridge sends JSON)
          const message = JSON.parse(event.data);

          // Foxglove Bridge message format varies, handle accordingly
          if (message.channel === 1 || message.type === 'message') {
            // Binary message - try to parse data
            if (message.data) {
              const data = message.data;
              const topicName = message.topic || message.name;

              // Parse based on topic
              switch (topicName) {
                case '/map':
                  try {
                    // Try to parse data as JSON if it's stringified
                    const mapData = typeof data === 'string' ? JSON.parse(data) : data;
                    const parsed = parseOccupancyGrid(mapData);
                    if (parsed) setRosMapData(parsed);
                  } catch (e) {
                    console.debug('[ROS] Map data received (raw)');
                  }
                  break;

                case '/odom':
                case '/odometry/filtered':
                case '/odometry/raw':
                  try {
                    const odomData = typeof data === 'string' ? JSON.parse(data) : data;
                    const parsed = parseOdometry(odomData);
                    if (parsed) setRobotPose((prev) => ({ ...parsed, source: topicName }));
                  } catch (e) {}
                  break;

                case '/scan':
                case '/scan_raw':
                  try {
                    const scanData = typeof data === 'string' ? JSON.parse(data) : data;
                    const parsed = parseLaserScan(scanData);
                    if (parsed) setLaserScan(parsed);
                  } catch (e) {}
                  break;

                case '/tf':
                  try {
                    const tfData = typeof data === 'string' ? JSON.parse(data) : data;
                    const parsed = parseTFMessage(tfData);
                    if (parsed) {
                      setTfData(parsed);
                      setRobotPose((prev) => prev?.source === 'tf' ? { ...parsed, source: 'tf' } : prev || { ...parsed, source: 'tf' });
                    }
                  } catch (e) {}
                  break;

                default:
                  if (!messageHandlersRef.current[topicName]) {
                    console.debug(`[ROS] Topic: ${topicName}`);
                    messageHandlersRef.current[topicName] = true;
                  }
              }
            }
          }
        } catch (e) {
          // Not JSON, might be binary data
          console.debug('[ROS] Received binary data');
        }
      };

      ws.onerror = (error) => {
        console.error('[ROS] ❌ WebSocket error:', error);
        setConnectionState('error');
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log(`[ROS] Connection closed:`, event.code, event.reason);
        setIsConnected(false);
        setConnectionState('disconnected');
        wsRef.current = null;

        // Auto-reconnect logic
        if (reconnectAttempt < DEFAULT_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          const delay = DEFAULT_CONFIG.RECONNECT_INTERVAL_MS * Math.pow(1.5, reconnectAttempt);
          console.log(`[ROS] Reconnecting in ${delay}ms... (attempt ${reconnectAttempt + 1})`);
          setConnectionState('reconnecting');
          setReconnectAttempt((prev) => prev + 1);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.error('[ROS] Max reconnect attempts reached');
          setError('Failed to reconnect after multiple attempts');
        }
      };

    } catch (error) {
      console.error('[ROS] Failed to create WebSocket:', error);
      setConnectionState('error');
      setError(error.message);
    }
  }, [robotIp, port, subscribeTopics, handleMessage, reconnectAttempt]);

  const disconnect = useCallback(() => {
    console.log('[ROS] Disconnecting...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
    setReconnectAttempt(0);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempt(0);
    setTimeout(connect, 500);
  }, [disconnect, connect]);

  // ============================================================
  // SEND COMMAND TO ROBOT
  // ============================================================

  const sendCmdVel = useCallback((linear, angular) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[ROS] Cannot send cmd_vel: not connected');
      return false;
    }

    // Foxglove bridge accepts JSON messages for topics
    const cmdVelMsg = JSON.stringify({
      type: 'message',
      topic: '/cmd_vel',
      data: JSON.stringify({
        header: {
          stamp: { sec: 0, nanosec: 0 },
          frame_id: 'base_link',
        },
        linear: { x: linear.x || 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: angular.z || 0 },
      }),
    });

    wsRef.current.send(cmdVelMsg);
    return true;
  }, []);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Connection State
    isConnected,
    connectionState,
    error,
    reconnectAttempt,
    robotIp,
    port,

    // ROS Data
    rosMapData,
    robotPose,
    laserScan,
    tfData,

    // Connection Methods
    connect,
    disconnect,
    reconnect,

    // Robot Control
    sendCmdVel,

    // Utilities
    connectionUrl: `ws://${robotIp}:${port}`,
    subscribedTopics: Array.from(subscribedTopicsRef.current),
  };
}

// ============================================================
// UTILITY HOOKS
// ============================================================

/**
 * Hook for accessing only robot pose data
 */
export function useRobotPose(options = {}) {
  const { robotIp, port, autoConnect } = options;
  const ros = useRosConnection({ robotIp, port, autoConnect, subscribeTopics: ['/odom', '/tf'] });
  return {
    ...ros,
    robotPose: ros.robotPose,
  };
}

/**
 * Hook for accessing only laser scan data
 */
export function useLaserScan(options = {}) {
  const { robotIp, port, autoConnect } = options;
  const ros = useRosConnection({ robotIp, port, autoConnect, subscribeTopics: ['/scan'] });
  return {
    ...ros,
    laserScan: ros.laserScan,
  };
}

/**
 * Hook for accessing only map data
 */
export function useRosMap(options = {}) {
  const { robotIp, port, autoConnect } = options;
  const ros = useRosConnection({ robotIp, port, autoConnect, subscribeTopics: ['/map'] });
  return {
    ...ros,
    rosMapData: ros.rosMapData,
  };
}

// Default export
export default useRosConnection;
