/**
 * Mock data for the Giám Sát Robot (Robot Monitoring) page.
 *
 * Shape strictly mirrors the backend DTOs in:
 *   src/SmartMarketBot.Application/Models/Robots/RobotDtos.cs
 *   src/SmartMarketBot.Application/Models/Maps/MapSyncDtos.cs
 *   src/SmartMarketBot.Application/Models/RobotRoutes/RobotRouteDtos.cs
 *
 * Coordinates are kept in the same coordinate space as the floorplan
 * image (meters), so the UI can render nodes, edges and robots directly
 * onto the floorplan image via transform: translate(x px, y px).
 */

// --------- Robots ----------
export const mockRobots = [
  {
    robotId: 1,
    robotName: 'AMR-01',
    robotCode: 'AMR-01',
    batteryPct: 86,
    mode: 'patrol',
    status: 'Moving',
    lastSeenAt: '2026-07-07T03:42:11Z',
    ipAddress: '10.0.4.21',
  },
  {
    robotId: 2,
    robotName: 'AMR-02',
    robotCode: 'AMR-02',
    batteryPct: 42,
    mode: 'idle',
    status: 'Idle',
    lastSeenAt: '2026-07-07T03:42:05Z',
    ipAddress: '10.0.4.22',
  },
  {
    robotId: 3,
    robotName: 'AMR-03',
    robotCode: 'AMR-03',
    batteryPct: 12,
    mode: 'return',
    status: 'Moving',
    lastSeenAt: '2026-07-07T03:41:58Z',
    ipAddress: '10.0.4.23',
  },
  {
    robotId: 4,
    robotName: 'AMR-04',
    robotCode: 'AMR-04',
    batteryPct: 100,
    mode: 'charging',
    status: 'Offline_Charging',
    lastSeenAt: '2026-07-07T03:00:30Z',
    ipAddress: '10.0.4.24',
  },
  {
    robotId: 5,
    robotName: 'AMR-05',
    robotCode: 'AMR-05',
    batteryPct: 0,
    mode: 'off',
    status: 'Power_Off',
    lastSeenAt: '2026-07-06T18:11:00Z',
    ipAddress: null,
  },
]

// Robot poses on the floorplan (x, y in meters, heading in radians)
// Robot_PoseDto shape: { robotCode, x, y, headingRad, headingDeg, timestampUtc }
export const mockRobotPoses = {
  'AMR-01': {
    robotCode: 'AMR-01',
    x: 18.2,
    y: 9.6,
    headingRad: 0.0,
    headingDeg: 0,
    timestampUtc: '2026-07-07T03:42:11Z',
  },
  'AMR-02': {
    robotCode: 'AMR-02',
    x: 6.5,
    y: 14.2,
    headingRad: 1.57,
    headingDeg: 90,
    timestampUtc: '2026-07-07T03:42:05Z',
  },
  'AMR-03': {
    robotCode: 'AMR-03',
    x: 22.0,
    y: 2.5,
    headingRad: 3.14,
    headingDeg: 180,
    timestampUtc: '2026-07-07T03:41:58Z',
  },
  'AMR-04': {
    robotCode: 'AMR-04',
    x: 1.0,
    y: 1.0,
    headingRad: 0.0,
    headingDeg: 0,
    timestampUtc: '2026-07-07T03:00:30Z',
  },
  'AMR-05': {
    robotCode: 'AMR-05',
    x: 0,
    y: 0,
    headingRad: 0,
    headingDeg: 0,
    timestampUtc: '2026-07-06T18:11:00Z',
  },
}

// --------- Map (1 floor) ----------
// Floor is ~24m x 18m. Nodes arranged like aisles in a small supermarket.
export const mockMap = {
  mapId: 1,
  floorId: 1,
  mapName: 'Tầng 1 — Siêu thị mini',
  createdAt: '2026-07-06T10:00:00Z',
  floorplanImageUrl: null, // UI paints a placeholder grid instead
  widthMeters: 24,
  heightMeters: 18,
  nodes: [
    { nodeId: 1,  nodeName: 'Dock 1',  xCoord: 1,  yCoord: 1,  nodeType: 'dock',   isBlocked: false },
    { nodeId: 2,  nodeName: 'Dock 2',  xCoord: 1,  yCoord: 17, nodeType: 'dock',   isBlocked: false },
    { nodeId: 3,  nodeName: 'A1-Start',xCoord: 4,  yCoord: 3,  nodeType: 'aisle',  isBlocked: false },
    { nodeId: 4,  nodeName: 'A1-End',  xCoord: 4,  yCoord: 15, nodeType: 'aisle',  isBlocked: false },
    { nodeId: 5,  nodeName: 'A2-Start',xCoord: 8,  yCoord: 3,  nodeType: 'aisle',  isBlocked: false },
    { nodeId: 6,  nodeName: 'A2-End',  xCoord: 8,  yCoord: 15, nodeType: 'aisle',  isBlocked: false },
    { nodeId: 7,  nodeName: 'A3-Start',xCoord: 12, yCoord: 3,  nodeType: 'aisle',  isBlocked: true  },
    { nodeId: 8,  nodeName: 'A3-End',  xCoord: 12, yCoord: 15, nodeType: 'aisle',  isBlocked: false },
    { nodeId: 9,  nodeName: 'A4-Start',xCoord: 16, yCoord: 3,  nodeType: 'aisle',  isBlocked: false },
    { nodeId: 10, nodeName: 'A4-End',  xCoord: 16, yCoord: 15, nodeType: 'aisle',  isBlocked: false },
    { nodeId: 11, nodeName: 'A5-Start',xCoord: 20, yCoord: 3,  nodeType: 'aisle',  isBlocked: false },
    { nodeId: 12, nodeName: 'A5-End',  xCoord: 20, yCoord: 15, nodeType: 'aisle',  isBlocked: false },
    { nodeId: 13, nodeName: 'Checkout',xCoord: 22, yCoord: 9, nodeType: 'poi',    isBlocked: false },
    { nodeId: 14, nodeName: 'Entrance',xCoord: 14, yCoord: 17, nodeType: 'poi',    isBlocked: false },
  ],
  edges: [
    { edgeId: 1,  fromNodeId: 1,  toNodeId: 3,  distance: 3.6, isBidirectional: true },
    { edgeId: 2,  fromNodeId: 3,  toNodeId: 4,  distance: 12.0, isBidirectional: true },
    { edgeId: 3,  fromNodeId: 4,  toNodeId: 5,  distance: 4.0, isBidirectional: true },
    { edgeId: 4,  fromNodeId: 5,  toNodeId: 6,  distance: 12.0, isBidirectional: true },
    { edgeId: 5,  fromNodeId: 6,  toNodeId: 7,  distance: 4.0, isBidirectional: true },
    { edgeId: 6,  fromNodeId: 7,  toNodeId: 8,  distance: 12.0, isBidirectional: true },
    { edgeId: 7,  fromNodeId: 8,  toNodeId: 9,  distance: 4.0, isBidirectional: true },
    { edgeId: 8,  fromNodeId: 9,  toNodeId: 10, distance: 12.0, isBidirectional: true },
    { edgeId: 9,  fromNodeId: 10, toNodeId: 11, distance: 4.0, isBidirectional: true },
    { edgeId: 10, fromNodeId: 11, toNodeId: 12, distance: 12.0, isBidirectional: true },
    { edgeId: 11, fromNodeId: 12, toNodeId: 13, distance: 6.3, isBidirectional: true },
    { edgeId: 12, fromNodeId: 4,  toNodeId: 14, distance: 10.3, isBidirectional: true },
    { edgeId: 13, fromNodeId: 8,  toNodeId: 14, distance: 6.3, isBidirectional: true },
    { edgeId: 14, fromNodeId: 2,  toNodeId: 4,  distance: 3.6, isBidirectional: true },
  ],
  semanticObjects: [
    { objectId: 1, objectType: 'shelf', xMin: 3, yMin: 4, xMax: 5, yMax: 14, label: 'Aisle A1' },
    { objectId: 2, objectType: 'shelf', xMin: 7, yMin: 4, xMax: 9, yMax: 14, label: 'Aisle A2' },
    { objectId: 3, objectType: 'shelf', xMin: 11, yMin: 4, xMax: 13, yMax: 14, label: 'Aisle A3' },
    { objectId: 4, objectType: 'checkout', xMin: 21, yMin: 8, xMax: 23, yMax: 10, label: 'Checkout' },
  ],
}

export const mockMapStats = {
  totalNodes: mockMap.nodes.length,
  totalEdges: mockMap.edges.length,
  totalSemanticObjects: mockMap.semanticObjects.length,
  lastSyncedAt: mockMap.createdAt,
  mapId: mockMap.mapId,
}

// --------- Routes ----------
// RobotRouteListDto: { robotRouteId, mapId, routeName, routeType, description?, zoneId?, zoneName?, robotId, createdAt, waypointCount }
export const mockRoutes = [
  {
    robotRouteId: 1,
    mapId: 1,
    routeName: 'Tuần tra khu vực A1–A2',
    routeType: 'patrol',
    description: 'Lặp 2 kệ đầu, mỗi 30 phút/lượt',
    zoneId: 1,
    zoneName: 'Khu rau quả',
    robotId: 1,
    createdAt: '2026-07-06T11:00:00Z',
    waypointCount: 5,
  },
  {
    robotRouteId: 2,
    mapId: 1,
    routeName: 'Hỗ trợ khách — Về Checkout',
    routeType: 'assist',
    description: 'Đón khách ở Entrance, đưa về quầy thanh toán',
    zoneId: null,
    zoneName: null,
    robotId: 2,
    createdAt: '2026-07-06T11:30:00Z',
    waypointCount: 2,
  },
  {
    robotRouteId: 3,
    mapId: 1,
    routeName: 'Vận chuyển nội bộ — Dock 1 → A3',
    routeType: 'delivery',
    description: 'Chuyển hàng từ Dock 1 đến giữa kệ A3 (đang bảo trì)',
    zoneId: 2,
    zoneName: 'Khu tạp hóa',
    robotId: 3,
    createdAt: '2026-07-06T14:20:00Z',
    waypointCount: 4,
  },
]

// RobotRouteDetailDto: includes Waypoints[] = { nodeId, nodeName, xCoord, yCoord, sequenceOrder }
export const mockRouteDetails = {
  1: {
    robotRouteId: 1,
    mapId: 1,
    routeName: 'Tuần tra khu vực A1–A2',
    routeType: 'patrol',
    description: 'Lặp 2 kệ đầu, mỗi 30 phút/lượt',
    zoneId: 1,
    zoneName: 'Khu rau quả',
    robotId: 1,
    createdAt: '2026-07-06T11:00:00Z',
    waypoints: [
      { nodeId: 1,  nodeName: 'Dock 1',   xCoord: 1,  yCoord: 1,  sequenceOrder: 0 },
      { nodeId: 3,  nodeName: 'A1-Start', xCoord: 4,  yCoord: 3,  sequenceOrder: 1 },
      { nodeId: 4,  nodeName: 'A1-End',   xCoord: 4,  yCoord: 15, sequenceOrder: 2 },
      { nodeId: 5,  nodeName: 'A2-Start', xCoord: 8,  yCoord: 3,  sequenceOrder: 3 },
      { nodeId: 1,  nodeName: 'Dock 1',   xCoord: 1,  yCoord: 1,  sequenceOrder: 4 },
    ],
  },
  2: {
    robotRouteId: 2,
    mapId: 1,
    routeName: 'Hỗ trợ khách — Về Checkout',
    routeType: 'assist',
    description: 'Đón khách ở Entrance, đưa về quầy thanh toán',
    zoneId: null,
    zoneName: null,
    robotId: 2,
    createdAt: '2026-07-06T11:30:00Z',
    waypoints: [
      { nodeId: 14, nodeName: 'Entrance', xCoord: 14, yCoord: 17, sequenceOrder: 0 },
      { nodeId: 13, nodeName: 'Checkout', xCoord: 22, yCoord: 9,  sequenceOrder: 1 },
    ],
  },
  3: {
    robotRouteId: 3,
    mapId: 1,
    routeName: 'Vận chuyển nội bộ — Dock 1 → A3',
    routeType: 'delivery',
    description: 'Chuyển hàng từ Dock 1 đến giữa kệ A3',
    zoneId: 2,
    zoneName: 'Khu tạp hóa',
    robotId: 3,
    createdAt: '2026-07-06T14:20:00Z',
    waypoints: [
      { nodeId: 1, nodeName: 'Dock 1',   xCoord: 1,  yCoord: 1,  sequenceOrder: 0 },
      { nodeId: 5, nodeName: 'A2-Start', xCoord: 8,  yCoord: 3,  sequenceOrder: 1 },
      { nodeId: 6, nodeName: 'A2-End',   xCoord: 8,  yCoord: 15, sequenceOrder: 2 },
      { nodeId: 9, nodeName: 'A4-Start', xCoord: 16, yCoord: 3,  sequenceOrder: 3 },
    ],
  },
}

// ----- Convenience: which route a robot is currently assigned to (UI hint only) -----
export const mockAssignments = {
  'AMR-01': 1,
  'AMR-02': 2,
  'AMR-03': 3,
  'AMR-04': null,
  'AMR-05': null,
}
