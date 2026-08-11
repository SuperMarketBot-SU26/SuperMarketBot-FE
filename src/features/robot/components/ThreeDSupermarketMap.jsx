import React, { useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function ThreeDSupermarketMap({
  map,
  robots = [],
  robotPoses = {},
  selectedNodeId = null,
  onNodeClick,
  onToggleEdit,
  // ROS Bridge Props
  enableRosBridge = false,
  rosMapData = null,
  rosRobotPose = null,
  laserScan = null,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const robotMeshesRef = useRef({})
  const nodesGroupRef = useRef(null)
  const floorMeshRef = useRef(null)
  const laserPointsRef = useRef(null)
  const smoothedRosPoseRef = useRef({ x: 0, y: 0, yaw: 0 })

  const widthMeters = map?.widthMeters || 13.6
  const heightMeters = map?.heightMeters || 8.35

  // Smooth ROS pose for 3D animation
  useEffect(() => {
    if (!rosRobotPose) return

    const target = {
      x: rosRobotPose.position?.x || 0,
      y: rosRobotPose.position?.y || 0,
      yaw: rosRobotPose.orientation?.yaw || 0,
    }

    const lerpFactor = 0.15
    smoothedRosPoseRef.current = {
      x: smoothedRosPoseRef.current.x + (target.x - smoothedRosPoseRef.current.x) * lerpFactor,
      y: smoothedRosPoseRef.current.y + (target.y - smoothedRosPoseRef.current.y) * lerpFactor,
      yaw: smoothedRosPoseRef.current.yaw + (target.yaw - smoothedRosPoseRef.current.yaw) * lerpFactor,
    }
  }, [rosRobotPose])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 500

    // 1. Scene Setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0f17) // Dark Tech Background
    sceneRef.current = scene

    // 2. Camera Setup (Perspective 3D)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(widthMeters / 2, 14, heightMeters * 1.5)

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // 4. Orbit Controls (360° Rotation & Pan)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.target.set(widthMeters / 2, 0, heightMeters / 2)
    controls.maxPolarAngle = Math.PI / 2 - 0.05 // Don't go below floor

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(widthMeters, 20, heightMeters / 2)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    scene.add(dirLight)

    const pointLight1 = new THREE.PointLight(0x3b82f6, 1.2, 20)
    pointLight1.position.set(widthMeters * 0.2, 5, heightMeters * 0.2)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x22c55e, 1.2, 20)
    pointLight2.position.set(widthMeters * 0.8, 5, heightMeters * 0.8)
    scene.add(pointLight2)

    // Outer Boundary Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
    const createWall = (w, h, d, x, y, z) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
      wall.position.set(x, y, z)
      wall.castShadow = true
      scene.add(wall)
    }
    createWall(widthMeters, 0.4, 0.1, widthMeters / 2, 0.2, 0)
    createWall(widthMeters, 0.4, 0.1, widthMeters / 2, 0.2, heightMeters)
    createWall(0.1, 0.4, heightMeters, 0, 0.2, heightMeters / 2)
    createWall(0.1, 0.4, heightMeters, widthMeters, 0.2, heightMeters / 2)

    // Calculate Real Map Bounding Box from actual Nodes & Objects
    let minX = 0, maxX = widthMeters, minY = 0, maxY = heightMeters
    if (map?.nodes && map.nodes.length > 0) {
      const xs = map.nodes.map((n) => n.xCoord)
      const ys = map.nodes.map((n) => n.yCoord)
      minX = Math.min(...xs) - 1.5
      maxX = Math.max(...xs) + 1.5
      minY = Math.min(...ys) - 1.5
      maxY = Math.max(...ys) + 1.5
    }

    const mapW = Math.max(maxX - minX, 10)
    const mapH = Math.max(maxY - minY, 8)
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    camera.position.set(centerX, Math.max(mapW, mapH) * 1.2, centerY + mapH * 1.1)
    controls.target.set(centerX, 0, centerY)

    // 6. Glossy 3D Supermarket Floor
    const floorGeo = new THREE.PlaneGeometry(mapW, mapH)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2,
      metalness: 0.5,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(centerX, 0, centerY)
    floor.receiveShadow = true
    scene.add(floor)
    floorMeshRef.current = floor

    // Grid Helper centered on floor
    const gridHelper = new THREE.GridHelper(Math.max(mapW, mapH) * 1.3, 20, 0x334155, 0x1e293b)
    gridHelper.position.set(centerX, 0.01, centerY)
    scene.add(gridHelper)

    // 7. Dynamic Zone Tiles based on Bounding Box
    const halfW = mapW / 2
    const halfH = mapH / 2
    const createZoneTile = (x, z, w, h, colorHex) => {
      const geo = new THREE.PlaneGeometry(w, h)
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.set(x + w / 2, 0.02, z + h / 2)
      scene.add(mesh)
    }
    createZoneTile(minX, minY, halfW - 0.2, halfH - 0.2, 0xf59e0b) // Zone 1
    createZoneTile(minX + halfW + 0.2, minY, halfW - 0.2, halfH - 0.2, 0x0284c7) // Zone 2
    createZoneTile(minX, minY + halfH + 0.2, halfW - 0.2, halfH - 0.2, 0x16a34a) // Zone 3
    createZoneTile(minX + halfW + 0.2, minY + halfH + 0.2, halfW - 0.2, halfH - 0.2, 0xe11d48) // Zone 4

    // 8. 3D Shelves & Semantic Objects from Database
    const shelfGroup = new THREE.Group()
    const defaultShelfGeo = new THREE.BoxGeometry(0.7, 1.0, 0.4)
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0.7 })

    // Render from map.semanticObjects if available, or fallback to Kệ Nodes
    if (map?.semanticObjects && map.semanticObjects.length > 0) {
      map.semanticObjects.forEach((obj) => {
        const objW = Math.max(obj.xMax - obj.xMin, 0.6)
        const objH = Math.max(obj.yMax - obj.yMin, 0.4)
        const geo = new THREE.BoxGeometry(objW, 1.1, objH)
        const mesh = new THREE.Mesh(geo, shelfMat)
        mesh.position.set((obj.xMin + obj.xMax) / 2, 0.55, (obj.yMin + obj.yMax) / 2)
        mesh.castShadow = true
        mesh.receiveShadow = true
        shelfGroup.add(mesh)
      })
    } else {
      map?.nodes?.forEach((n) => {
        if (n.nodeName?.toLowerCase().includes('kệ') || n.nodeName?.toLowerCase().includes('aisle') || n.nodeName?.toLowerCase().includes('dock')) {
          const shelf = new THREE.Mesh(defaultShelfGeo, shelfMat)
          shelf.position.set(n.xCoord, 0.5, n.yCoord)
          shelf.castShadow = true
          shelf.receiveShadow = true
          shelfGroup.add(shelf)
        }
      })
    }
    scene.add(shelfGroup)

    // 9. Navigation Nodes (3D Glowing Spheres)
    const nodesGroup = new THREE.Group()
    nodesGroupRef.current = nodesGroup

    map?.nodes?.forEach((n) => {
      const isSelected = selectedNodeId === n.nodeId
      const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16)
      const nodeMat = new THREE.MeshStandardMaterial({
        color: n.isBlocked ? 0xe11d48 : isSelected ? 0x22c55e : 0x38bdf8,
        emissive: isSelected ? 0x22c55e : 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
      nodeMesh.position.set(n.xCoord, 0.12, n.yCoord)
      nodeMesh.userData = n
      nodesGroup.add(nodeMesh)
    })
    scene.add(nodesGroup)

    // 10. Animation Loop
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      controls.update()

      // Rotate robot status rings
      Object.values(robotMeshesRef.current).forEach((r) => {
        if (r.ring) r.ring.rotation.z += 0.02
      })

      renderer.render(scene, camera)
    }
    animate()

    // Handle Resize
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [map, widthMeters, heightMeters, selectedNodeId, enableRosBridge])

  // Update Robot 3D Position & Heading
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Use ROS pose if available, otherwise fall back to robotPoses
    const useRosPose = enableRosBridge && smoothedRosPoseRef.current

    robots.forEach((r) => {
      const basePose = useRosPose ? smoothedRosPoseRef.current : (robotPoses[r.robotCode] || { x: widthMeters / 2, y: heightMeters / 2, headingDeg: 0 })
      
      const pose = useRosPose 
        ? basePose 
        : { x: basePose.x, y: basePose.y, headingDeg: basePose.headingDeg || 0 }

      let robotMesh = robotMeshesRef.current[r.robotCode]
      if (!robotMesh) {
        // Create 3D Robot Mesh
        const group = new THREE.Group()

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.4, 32)
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.2, metalness: 0.8 })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = 0.2
        body.castShadow = true
        group.add(body)

        // Head Dome
        const headGeo = new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
        const headMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 })
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 0.4
        group.add(head)

        // Direction Arrow Nose
        const noseGeo = new THREE.ConeGeometry(0.08, 0.2, 16)
        const noseMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const nose = new THREE.Mesh(noseGeo, noseMat)
        nose.rotation.x = Math.PI / 2
        nose.position.set(0, 0.3, 0.35)
        group.add(nose)

        // Halo Ring
        const ringGeo = new THREE.RingGeometry(0.45, 0.5, 32)
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = -Math.PI / 2
        ring.position.y = 0.03
        group.add(ring)

        scene.add(group)
        robotMesh = { group, ring }
        robotMeshesRef.current[r.robotCode] = robotMesh
      }

      robotMesh.group.position.set(pose.x, 0, pose.y)
      const yaw = useRosPose ? -pose.yaw : -(pose.headingDeg || 0) * (Math.PI / 180)
      robotMesh.group.rotation.y = yaw
    })
  }, [robots, robotPoses, widthMeters, heightMeters, enableRosBridge])

  // Update floor texture from ROS OccupancyGrid
  useEffect(() => {
    if (!enableRosBridge || !rosMapData || !floorMeshRef.current) return

    const { info, data } = rosMapData
    if (!data || !data.length) return

    const { width, height, resolution } = info
    const size = width * height
    
    // Create image data for DataTexture
    const imageData = new Uint8Array(size * 4)
    
    for (let i = 0; i < size; i++) {
      const value = data[i] ?? -1
      const idx = i * 4
      
      if (value === -1) {
        // Unknown - gray
        imageData[idx] = 100
        imageData[idx + 1] = 100
        imageData[idx + 2] = 120
        imageData[idx + 3] = 128
      } else if (value === 0) {
        // Free space
        imageData[idx] = 30
        imageData[idx + 1] = 35
        imageData[idx + 2] = 45
        imageData[idx + 3] = 200
      } else {
        // Occupied - darker
        const intensity = Math.min(255, value * 2.5)
        imageData[idx] = intensity * 0.2
        imageData[idx + 1] = intensity * 0.25
        imageData[idx + 2] = intensity * 0.35
        imageData[idx + 3] = 255
      }
    }

    const texture = new THREE.DataTexture(imageData, width, height, THREE.RGBAFormat)
    texture.needsUpdate = true
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter

    if (floorMeshRef.current.material) {
      floorMeshRef.current.material.map = texture
      floorMeshRef.current.material.needsUpdate = true
    }
  }, [enableRosBridge, rosMapData])

  // Update laser scan visualization
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !enableRosBridge || !laserScan?.points?.length) return

    // Remove old laser points
    if (laserPointsRef.current) {
      scene.remove(laserPointsRef.current)
      laserPointsRef.current.geometry?.dispose()
      laserPointsRef.current.material?.dispose()
    }

    // Create new point cloud
    const points = laserScan.points
    const positions = new Float32Array(points.length * 3)
    const colors = new Float32Array(points.length * 3)

    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = 0.1 // Slightly above floor

      // Red gradient based on distance
      const intensity = Math.min(1, p.range / 5)
      colors[i * 3] = 1.0
      colors[i * 3 + 1] = 0.3 * (1 - intensity)
      colors[i * 3 + 2] = 0.2 * (1 - intensity)
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    const pointCloud = new THREE.Points(geometry, material)
    laserPointsRef.current = pointCloud
    scene.add(pointCloud)

    return () => {
      if (laserPointsRef.current) {
        scene.remove(laserPointsRef.current)
        laserPointsRef.current.geometry?.dispose()
        laserPointsRef.current.material?.dispose()
      }
    }
  }, [enableRosBridge, laserScan])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-[#0b0f17] shadow-sm">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* 3D HUD Guide & Map Editor Link Overlay */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3">
        <div className="pointer-events-none flex flex-col gap-1 rounded-xl border border-emerald-500/30 bg-slate-900/80 p-3 text-[11px] backdrop-blur-md shadow-lg text-slate-200">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <span className="material-symbols-outlined text-[16px]">3d_rotation</span>
            3D Supermarket WebGL Canvas (Three.js)
          </div>
          <p className="text-[10px] text-slate-400">
            🖱️ <b>Xoay 360°:</b> Giữ chuột trái + Kéo | 🔍 <b>Thu/Phóng:</b> Con trỏ chuột | ✋ <b>Di chuyển:</b> Chuột phải
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleEdit}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">edit_square</span>
          Chỉnh Sửa Vị Trí Zone & Kệ Hàng (Map Editor)
        </button>
      </div>
    </div>
  )
}
