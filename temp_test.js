        // For the standalone test page, Edit mode is ALWAYS enabled
        window.isEditMode = true;
        document.body.classList.add('edit-mode');

        // Config & State
        let RESOLUTION = 0.05;
        let ORIGIN_X = -10.0;
        let ORIGIN_Y = -10.0;

        const mapCanvas = document.getElementById('mapCanvas');
        const uiCanvas = document.getElementById('uiCanvas');
        const container = document.getElementById('mapContainer');
        const ctxMap = mapCanvas.getContext('2d');
        const ctxUI = uiCanvas.getContext('2d');

        let IMAGE_HEIGHT = mapCanvas.height;
        let IMAGE_WIDTH = mapCanvas.width;

        let robotMapX = 0.0;
        let robotMapY = 0.0;
        let robotHeading = 0.0;
        let waypoints = [];
        let draftWaypoint = null; // Biến lưu tạm waypoint đang kéo hướng
        let pgmImageData = null;

        // --- CSS Transform Variables cho PAN & ZOOM ---
        let scale = 1.0;
        let translateX = (container.clientWidth - IMAGE_WIDTH) / 2;
        let translateY = (container.clientHeight - IMAGE_HEIGHT) / 2;
        let currentMode = 'pan';

        // Xử lý đổi Mode
        document.querySelectorAll('input[name="toolMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentMode = e.target.value;
                document.getElementById('instruction-pan').style.display = 'none';
                document.getElementById('instruction-draw').style.display = 'none';
                document.getElementById('instruction-initialpose').style.display = 'none';
                document.getElementById('instruction-navgoal').style.display = 'none';

                if (currentMode === 'pan') {
                    container.classList.remove('draw-mode');
                    document.getElementById('instruction-pan').style.display = 'block';
                } else {
                    container.classList.add('draw-mode');
                    if (currentMode === 'draw') document.getElementById('instruction-draw').style.display = 'block';
                    if (currentMode === 'initialpose') document.getElementById('instruction-initialpose').style.display = 'block';
                    if (currentMode === 'navgoal') document.getElementById('instruction-navgoal').style.display = 'block';
                }
            });
        });

        /** ==========================================
         * TÍNH TOÁN TỌA ĐỘ
         * ========================================== */
        function pixelToMap(pixelX, pixelY) {
            const mapX = ORIGIN_X + (pixelX * RESOLUTION);
            const mapY = ORIGIN_Y + ((IMAGE_HEIGHT - 1 - pixelY) * RESOLUTION);
            return { x: mapX, y: mapY };
        }

        function mapToPixel(mapX, mapY) {
            const pixelX = (mapX - ORIGIN_X) / RESOLUTION;
            const pixelY = IMAGE_HEIGHT - 1 - ((mapY - ORIGIN_Y) / RESOLUTION);
            return { x: pixelX, y: pixelY };
        }

        function pixelToScreen(px, py) {
            return {
                x: translateX + (px * scale),
                y: translateY + (py * scale)
            };
        }

        // --- JS Logic cho Waypoint Config Modal ---
        function openWpModal(index) {
            const wp = waypoints[index];
            if (!wp) return;

            document.getElementById('wp-edit-index').value = index;
            document.getElementById('wp-edit-name').value = wp.name || `Waypoint ${index + 1}`;
            document.getElementById('wp-edit-role').value = wp.role || 'ad';
            document.getElementById('wp-edit-type').value = wp.nodeType || 'Waypoint';
            document.getElementById('wp-edit-x').value = wp.x;
            document.getElementById('wp-edit-y').value = wp.y;
            document.getElementById('wp-edit-dwell').value = wp.dwellTimeSeconds !== undefined ? wp.dwellTimeSeconds : 30;
            document.getElementById('wp-edit-blocked').checked = wp.isBlocked || false;

            document.getElementById('wp-modal-overlay').style.display = 'block';
            document.getElementById('wp-modal').style.display = 'block';
        }

        function closeWpModal() {
            document.getElementById('wp-modal-overlay').style.display = 'none';
            document.getElementById('wp-modal').style.display = 'none';
        }

        function saveWpModal() {
            const index = parseInt(document.getElementById('wp-edit-index').value);
            if (index >= 0 && index < waypoints.length) {
                waypoints[index].name = document.getElementById('wp-edit-name').value;
                waypoints[index].role = document.getElementById('wp-edit-role').value;
                waypoints[index].nodeType = document.getElementById('wp-edit-type').value;
                waypoints[index].x = parseFloat(document.getElementById('wp-edit-x').value) || waypoints[index].x;
                waypoints[index].y = parseFloat(document.getElementById('wp-edit-y').value) || waypoints[index].y;
                waypoints[index].dwellTimeSeconds = parseInt(document.getElementById('wp-edit-dwell').value) || 0;
                waypoints[index].isBlocked = document.getElementById('wp-edit-blocked').checked;

                closeWpModal();
                renderUI(); // Render lại tên và vị trí

                const toast = document.getElementById('toast');
                toast.innerText = '✅ Cập nhật Config thành công!';
                toast.style.background = '#3b82f6';
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 2000);
            }
        }

        /** ==========================================
         * XỬ LÝ SỰ KIỆN CHUỘT (PAN / DRAW)
         * ========================================== */
        function applyTransform() {
            mapCanvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            document.getElementById('val-zoom').innerText = Math.round(scale * 100) + '%';
            renderUI();
        }

        function resizeUICanvas() {
            uiCanvas.width = container.clientWidth;
            uiCanvas.height = container.clientHeight;
            renderUI();
        }
        window.addEventListener('resize', resizeUICanvas);
        resizeUICanvas();
        applyTransform();

        let isDragging = false;
        let startClientX, startClientY;
        let startTranslateX, startTranslateY;

        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Chuột trái
                // Nếu không ở edit mode, chỉ cho phép kéo (pan) bản đồ
                if (!window.isEditMode) {
                    isDragging = true;
                    startClientX = e.clientX;
                    startClientY = e.clientY;
                    startTranslateX = translateX;
                    startTranslateY = translateY;
                    return;
                }

                // Kiểm tra click vào Waypoint cũ
                const containerRect = container.getBoundingClientRect();
                const mouseX = e.clientX - containerRect.left;
                const mouseY = e.clientY - containerRect.top;

                let clickedWpIndex = -1;
                for (let i = waypoints.length - 1; i >= 0; i--) {
                    const wp = waypoints[i];
                    const px = mapToPixel(wp.x, wp.y);
                    const screenPx = pixelToScreen(px.x, px.y);
                    if (Math.hypot(mouseX - screenPx.x, mouseY - screenPx.y) <= 15) {
                        clickedWpIndex = i;
                        break;
                    }
                }

                if (clickedWpIndex !== -1) {
                    openWpModal(clickedWpIndex);
                    return; // Dừng lại, không kéo thả map hay tạo WP mới
                }

                if (currentMode === 'pan') {
                    isDragging = true;
                    startClientX = e.clientX;
                    startClientY = e.clientY;
                    startTranslateX = translateX;
                    startTranslateY = translateY;
                } else if (currentMode === 'draw' || currentMode === 'initialpose' || currentMode === 'navgoal') {
                    const containerRect = container.getBoundingClientRect();
                    const mouseX = e.clientX - containerRect.left;
                    const mouseY = e.clientY - containerRect.top;

                    const pixelX = (mouseX - translateX) / scale;
                    const pixelY = (mouseY - translateY) / scale;
                    const mapCoords = pixelToMap(pixelX, pixelY);

                    document.getElementById('val-wx').innerText = mapCoords.x.toFixed(4);
                    document.getElementById('val-wy').innerText = mapCoords.y.toFixed(4);

                    draftWaypoint = {
                        x: mapCoords.x,
                        y: mapCoords.y,
                        heading: 0,
                        startX: e.clientX, // Tọa độ chuột gốc để tính góc
                        startY: e.clientY
                    };
                    renderUI();
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (currentMode === 'pan' && isDragging) {
                const dx = e.clientX - startClientX;
                const dy = e.clientY - startClientY;
                translateX = startTranslateX + dx;
                translateY = startTranslateY + dy;
                applyTransform();
            } else if (draftWaypoint && (currentMode === 'draw' || currentMode === 'initialpose' || currentMode === 'navgoal')) {
                // Tính toán hướng góc quay
                const dx = e.clientX - draftWaypoint.startX;
                const dy = e.clientY - draftWaypoint.startY; // Lưu ý: Canvas Y ngược hướng

                // Tránh tình trạng click nhấp nhả bị quay vòng vòng
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    // Trục Y của ROS hướng LÊN, Canvas hướng XUỐNG. Nên dy của ROS = -dy của Canvas
                    draftWaypoint.heading = Math.atan2(-dy, dx);
                }
                renderUI();
            }
        });

        /** ==========================================
         * AGENT CONTROL LOGIC (Start/Stop ROS 2)
         * ========================================== */
        function getAgentApiUrl() {
            const wsUrl = document.getElementById('ros-ws-url').value;
            try {
                const url = new URL(wsUrl.replace('ws://', 'http://'));
                return `http://${url.hostname}:5000/api/robot`;
            } catch(e) {
                return "http://192.168.0.100:5000/api/robot";
            }
        }
        
        async function checkAgentStatus() {
            try {
                const res = await fetch(`${getAgentApiUrl()}/status`);
                const data = await res.json();
                const statusEl = document.getElementById('val-agent-status');
                if (!statusEl) return;
                
                if (data.status === 'running') {
                    statusEl.innerText = 'Running';
                    statusEl.style.color = '#10b981';
                } else {
                    statusEl.innerText = 'Stopped';
                    statusEl.style.color = '#ef4444';
                }
            } catch (err) {
                const statusEl = document.getElementById('val-agent-status');
                if(statusEl) {
                    statusEl.innerText = 'Unreachable';
                    statusEl.style.color = '#64748b';
                }
            }
        }
        
        setInterval(checkAgentStatus, 3000);
        checkAgentStatus();

        async function startRobotOS() {
            const statusEl = document.getElementById('val-agent-status');
            const mode = document.getElementById('boot-mode').value;
            statusEl.innerText = 'Booting...';
            statusEl.style.color = '#f59e0b';
            try {
                const res = await fetch(`${getAgentApiUrl()}/start`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode: mode })
                });
                const data = await res.json();
                if (data.error) {
                    alert("Boot failed: " + data.error);
                    statusEl.innerText = 'Failed';
                    statusEl.style.color = '#ef4444';
                    return;
                }
                setTimeout(checkAgentStatus, 2000);
            } catch (err) {
                alert("Failed to contact Agent Server");
            }
        }

        async function stopRobotOS() {
            const statusEl = document.getElementById('val-agent-status');
            statusEl.innerText = 'Stopping...';
            statusEl.style.color = '#f59e0b';
            try {
                await fetch(`${getAgentApiUrl()}/stop`, { method: 'POST' });
                if(ros) ros.close();
                setTimeout(checkAgentStatus, 1500);
            } catch (err) {
                alert("Failed to contact Agent Server");
            }
        }

        function toggleMapUploadUI() {
            const mode = document.getElementById('boot-mode').value;
            const uploadSection = document.getElementById('amcl-upload-section');
            if(uploadSection) {
                uploadSection.style.display = mode === 'amcl' ? 'block' : 'none';
            }
        }
        
        async function uploadMapToRobot() {
            const files = document.getElementById('amclMapFiles').files;
            if (files.length !== 2) {
                alert("Please select BOTH the .yaml and .pgm file to upload to the robot.");
                return;
            }
            
            let yamlFile, pgmFile;
            for(let i=0; i<files.length; i++) {
                if(files[i].name.endsWith('.yaml')) yamlFile = files[i];
                if(files[i].name.endsWith('.pgm')) pgmFile = files[i];
            }
            
            if(!yamlFile || !pgmFile) {
                alert("Need one .yaml and one .pgm file.");
                return;
            }
            
            const toBase64 = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
            
            try {
                const toast = document.getElementById('toast');
                toast.innerText = '⏳ Uploading to robot...';
                toast.style.background = '#f59e0b';
                toast.classList.add('show');
                
                const yamlB64 = await toBase64(yamlFile);
                const pgmB64 = await toBase64(pgmFile);
                
                const res = await fetch(`${getAgentApiUrl()}/upload_map`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ yaml_b64: yamlB64, pgm_b64: pgmB64 })
                });
                
                const data = await res.json();
                if(data.error) throw new Error(data.error);
                
                toast.innerText = '✅ Map Uploaded to Robot!';
                toast.style.background = '#10b981';
                setTimeout(() => toast.classList.remove('show'), 2000);
            } catch(e) {
                alert("Upload failed: " + e.message);
                document.getElementById('toast').classList.remove('show');
            }
        }

        /** ==========================================
         * TÍCH HỢP ROS 2 (ROSLIBJS)
         * ========================================== */
        let ros = null;
        let initialPoseTopic = null;
        let goalPoseTopic = null;

        function connectROS() {
            const wsUrl = document.getElementById('ros-ws-url').value;
            const statusEl = document.getElementById('val-ros-status');
            const btn = document.getElementById('btn-ros-connect');
            const globalStatus = document.getElementById('global-ros-status');

            if (ros) {
                ros.close();
                return;
            }

            statusEl.innerText = 'Connecting...';
            statusEl.style.color = '#f59e0b';
            globalStatus.innerHTML = '<span style="font-size: 10px;">🟡</span> CONNECTING';

            ros = new ROSLIB.Ros({
                url: wsUrl
            });

            ros.on('connection', function () {
                statusEl.innerText = 'Connected';
                statusEl.style.color = '#10b981';
                btn.innerText = 'Disconnect';
                btn.style.background = '#ef4444';

                globalStatus.classList.add('connected');
                globalStatus.innerHTML = '<span style="font-size: 10px;">🟢</span> ROS 2 ONLINE';

                initialPoseTopic = new ROSLIB.Topic({
                    ros: ros,
                    name: '/initialpose',
                    messageType: 'geometry_msgs/PoseWithCovarianceStamped'
                });

                goalPoseTopic = new ROSLIB.Topic({
                    ros: ros,
                    name: '/goal_pose',
                    messageType: 'geometry_msgs/PoseStamped'
                });

                subscribeToRobotPose();

                alert('✅ Kết nối ROS 2 thành công! Bạn có thể dùng chế độ Initial Pose hoặc Nav Goal.');
            });

            ros.on('error', function (error) {
                statusEl.innerText = 'Error';
                statusEl.style.color = '#ef4444';
                globalStatus.classList.remove('connected');
                globalStatus.innerHTML = '<span style="font-size: 10px;">🔴</span> ERROR';
                console.error('Lỗi kết nối ROS:', error);
            });

            ros.on('close', function () {
                statusEl.innerText = 'Disconnected';
                statusEl.style.color = '#ef4444';
                btn.innerText = 'Connect';
                btn.style.background = '#10b981';
                globalStatus.classList.remove('connected');
                globalStatus.innerHTML = '<span style="font-size: 10px;">🔴</span> OFFLINE';
                ros = null;
                initialPoseTopic = null;
                goalPoseTopic = null;
            });
        }

        // --- Hàm gửi Pose chung cho ROS ---
        function sendRosPose(topic, x, y, yaw) {
            if (!ros || !topic) return false;

            const qz = Math.sin(yaw / 2.0);
            const qw = Math.cos(yaw / 2.0);

            // Nếu là initialpose thì dùng PoseWithCovarianceStamped
            if (topic.name === '/initialpose') {
                const poseMsg = new ROSLIB.Message({
                    header: { frame_id: 'map' },
                    pose: {
                        pose: {
                            position: { x: x, y: y, z: 0.0 },
                            orientation: { x: 0.0, y: 0.0, z: qz, w: qw }
                        },
                        covariance: [
                            0.25, 0.0, 0.0, 0.0, 0.0, 0.0,
                            0.0, 0.25, 0.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0, 0.0, 0.0, 0.068
                        ]
                    }
                });
                topic.publish(poseMsg);
            } else {
                // Goal Pose dùng PoseStamped
                const poseMsg = new ROSLIB.Message({
                    header: { frame_id: 'map' },
                    pose: {
                        position: { x: x, y: y, z: 0.0 },
                        orientation: { x: 0.0, y: 0.0, z: qz, w: qw }
                    }
                });
                topic.publish(poseMsg);
            }
            return true;
        }

        // --- Xử lý sự kiện thả chuột ---
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                if (currentMode === 'pan') {
                    isDragging = false;
                } else if (draftWaypoint && (currentMode === 'draw' || currentMode === 'initialpose' || currentMode === 'navgoal')) {

                    const toast = document.getElementById('toast');

                    if (currentMode === 'draw') {
                        waypoints.push({
                            x: draftWaypoint.x,
                            y: draftWaypoint.y,
                            heading: draftWaypoint.heading,
                            name: `Waypoint ${waypoints.length + 1}`,
                            role: 'ad',
                            nodeType: 'Waypoint',
                            isBlocked: false,
                            dwellTimeSeconds: 30
                        });
                        toast.innerText = '✅ Đã lưu Waypoint vào file YAML!';
                        toast.style.background = '#10b981';
                        toast.classList.add('show');

                    } else if (currentMode === 'initialpose') {
                        if (sendRosPose(initialPoseTopic, draftWaypoint.x, draftWaypoint.y, draftWaypoint.heading)) {
                            toast.innerText = '📍 Đã cài đặt Initial Pose!';
                            toast.style.background = 'rgba(16, 185, 129, 0.9)';
                            toast.classList.add('show');
                        } else {
                            alert("Vui lòng kết nối ROS 2 trước!");
                        }
                    } else if (currentMode === 'navgoal') {
                        if (sendRosPose(goalPoseTopic, draftWaypoint.x, draftWaypoint.y, draftWaypoint.heading)) {
                            toast.innerText = '🚀 Đã gửi Nav Goal! Robot đang di chuyển...';
                            toast.style.background = 'rgba(245, 158, 11, 0.9)'; // Màu cam
                            toast.classList.add('show');
                        } else {
                            alert("Vui lòng kết nối ROS 2 trước!");
                        }
                    }

                    setTimeout(() => toast.classList.remove('show'), 2500);
                    draftWaypoint = null;
                    renderUI();
                }
            }
        });

        // Xử lý lăn chuột (Zoom)
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomSensitivity = 0.0015;
            const delta = -e.deltaY * zoomSensitivity;
            let newScale = scale * Math.exp(delta);
            newScale = Math.max(0.2, Math.min(newScale, 40.0));

            const factor = newScale / scale;
            translateX = mouseX - (mouseX - translateX) * factor;
            translateY = mouseY - (mouseY - translateY) * factor;
            scale = newScale;

            applyTransform();
        }, { passive: false });

        /** ==========================================
         * XÓA WAYPOINT BẰNG CLICK CHUỘT PHẢI
         * ========================================== */
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            for (let i = waypoints.length - 1; i >= 0; i--) {
                const wp = waypoints[i];
                const px = mapToPixel(wp.x, wp.y);
                const screenPx = pixelToScreen(px.x, px.y);

                const dist = Math.hypot(mouseX - screenPx.x, mouseY - screenPx.y);

                if (dist <= 15) {
                    waypoints.splice(i, 1);
                    renderUI();

                    const toast = document.getElementById('toast');
                    toast.innerText = '🗑️ Đã xóa Waypoint!';
                    toast.style.background = '#ef4444';
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2000);
                    return;
                }
            }
        });

        /** ==========================================
         * ĐỌC FILE MAPPING (.YAML & .PGM)
         * ========================================== */
        document.getElementById('mapFiles').addEventListener('change', async (e) => {
            const files = e.target.files;
            let yamlFile = null;
            let pgmFile = null;

            for (let f of files) {
                if (f.name.endsWith('.yaml')) yamlFile = f;
                if (f.name.endsWith('.pgm')) pgmFile = f;
            }

            if (yamlFile) await parseYAML(yamlFile);
            if (pgmFile) await parsePGM(pgmFile);

            const scaleFitX = container.clientWidth / IMAGE_WIDTH;
            const scaleFitY = container.clientHeight / IMAGE_HEIGHT;
            scale = Math.min(scaleFitX, scaleFitY) * 0.9;
            translateX = (container.clientWidth - IMAGE_WIDTH * scale) / 2;
            translateY = (container.clientHeight - IMAGE_HEIGHT * scale) / 2;
            applyTransform();
        });

        async function parseYAML(file) {
            const text = await file.text();
            const resMatch = text.match(/resolution:\s*([\d\.]+)/);
            if (resMatch) RESOLUTION = parseFloat(resMatch[1]);

            const origMatch = text.match(/origin:\s*\[([\-\d\.]+),\s*([\-\d\.]+)/);
            if (origMatch) {
                ORIGIN_X = parseFloat(origMatch[1]);
                ORIGIN_Y = parseFloat(origMatch[2]);
            }

            document.getElementById('val-res').innerText = RESOLUTION;
            document.getElementById('val-ox').innerText = ORIGIN_X;
            document.getElementById('val-oy').innerText = ORIGIN_Y;
        }

        async function parsePGM(file) {
            const buffer = await file.arrayBuffer();
            const data = new Uint8Array(buffer);
            let offset = 0;

            function readWord() {
                while (offset < data.length && (data[offset] <= 32 || data[offset] === 35)) {
                    if (data[offset] === 35) {
                        while (offset < data.length && data[offset] !== 10) offset++;
                    } else {
                        offset++;
                    }
                }
                if (offset >= data.length) return null;
                let start = offset;
                while (offset < data.length && data[offset] > 32) offset++;
                return String.fromCharCode.apply(null, data.subarray(start, offset));
            }

            const magic = readWord();
            if (magic !== 'P5') { alert("Chỉ hỗ trợ PGM Binary (P5)"); return; }

            IMAGE_WIDTH = parseInt(readWord());
            IMAGE_HEIGHT = parseInt(readWord());
            const maxVal = parseInt(readWord());
            offset++;

            mapCanvas.width = IMAGE_WIDTH;
            mapCanvas.height = IMAGE_HEIGHT;
            document.getElementById('val-size').innerText = `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`;

            pgmImageData = ctxMap.createImageData(IMAGE_WIDTH, IMAGE_HEIGHT);
            const pixels = pgmImageData.data;
            const pgmData = data.subarray(offset);

            for (let i = 0; i < IMAGE_WIDTH * IMAGE_HEIGHT; i++) {
                let val = pgmData[i];
                pixels[i * 4] = val;
                pixels[i * 4 + 1] = val;
                pixels[i * 4 + 2] = val;
                pixels[i * 4 + 3] = (val > 250) ? 0 : 255;
            }

            ctxMap.putImageData(pgmImageData, 0, 0);
            renderUI();
        }

        /** ==========================================
         * HÀM VẼ WAYPOINT CHUNG (Dùng cho cả lúc Nháp & Hoàn thiện)
         * ========================================== */
        function drawWaypoint(ctx, screenPx, heading, labelText, isDraft = false) {
            // Vẽ tia chỉ hướng (Heading Line)
            if (heading !== undefined) {
                const arrowLen = 30; // Mũi tên dài ra cho dễ nhìn
                const endX = screenPx.x + Math.cos(heading) * arrowLen;
                const endY = screenPx.y - Math.sin(heading) * arrowLen; // Trừ sin() vì Y ngược

                ctx.beginPath();
                ctx.moveTo(screenPx.x, screenPx.y);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = '#f59e0b'; // Màu cam
                ctx.lineWidth = 3;
                ctx.stroke();

                // Mũi tên nhọn
                const arrowSize = 6;
                const angle1 = heading + Math.PI / 4;
                const angle2 = heading - Math.PI / 4;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - Math.cos(angle1) * arrowSize, endY + Math.sin(angle1) * arrowSize);
                ctx.lineTo(endX - Math.cos(angle2) * arrowSize, endY + Math.sin(angle2) * arrowSize);
                ctx.closePath();
                ctx.fillStyle = '#f59e0b';
                ctx.fill();
            }

            // Cục node màu đỏ (Nổi bật hơn nếu đang nháp)
            ctx.beginPath(); ctx.arc(screenPx.x, screenPx.y, isDraft ? 9 : 7, 0, Math.PI * 2);
            ctx.fillStyle = '#f43f5e'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = isDraft ? 3 : 2; ctx.stroke();

            // Tên WP
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
            ctx.fillText(labelText, screenPx.x - 14, screenPx.y - 15);
        }

        /** ==========================================
         * HIỂN THỊ UI VECTOR (Luôn sắc nét)
         * ========================================== */
        function renderUI() {
            ctxUI.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

            // Vẽ Gốc tọa độ
            const originPx = mapToPixel(0, 0);
            const originScreen = pixelToScreen(originPx.x, originPx.y);
            ctxUI.beginPath(); ctxUI.arc(originScreen.x, originScreen.y, 5, 0, Math.PI * 2);
            ctxUI.fillStyle = '#10b981'; ctxUI.fill();
            ctxUI.font = 'bold 12px sans-serif';
            ctxUI.fillText('ROS Origin (0,0)', originScreen.x + 8, originScreen.y - 8);

            // Vẽ Waypoints đã lưu
            waypoints.forEach((wp, index) => {
                const px = mapToPixel(wp.x, wp.y);
                const screenPx = pixelToScreen(px.x, px.y);
                drawWaypoint(ctxUI, screenPx, wp.heading, wp.name || `WP ${index + 1}`, false);
            });

            // Vẽ Waypoint ĐANG KÉO NHÁP (Draft)
            if (draftWaypoint) {
                const px = mapToPixel(draftWaypoint.x, draftWaypoint.y);
                const screenPx = pixelToScreen(px.x, px.y);
                // Vẽ tia đứt quãng cho sinh động khi kéo
                ctxUI.setLineDash([5, 5]);
                drawWaypoint(ctxUI, screenPx, draftWaypoint.heading, `New WP`, true);
                ctxUI.setLineDash([]); // Reset
            }

            // Vẽ Robot
            const rPx = mapToPixel(robotMapX, robotMapY);
            const rScreen = pixelToScreen(rPx.x, rPx.y);

            ctxUI.beginPath(); ctxUI.arc(rScreen.x, rScreen.y, 16, 0, Math.PI * 2);
            ctxUI.fillStyle = 'rgba(56, 189, 248, 0.2)'; ctxUI.fill();
            ctxUI.beginPath(); ctxUI.arc(rScreen.x, rScreen.y, 8, 0, Math.PI * 2);
            ctxUI.fillStyle = '#38bdf8'; ctxUI.fill();
            ctxUI.strokeStyle = '#fff'; ctxUI.lineWidth = 2; ctxUI.stroke();

            // Vẽ tia chỉ hướng của robot
            const robotEndX = rScreen.x + Math.cos(robotHeading) * 20;
            const robotEndY = rScreen.y - Math.sin(robotHeading) * 20;
            ctxUI.beginPath();
            ctxUI.moveTo(rScreen.x, rScreen.y);
            ctxUI.lineTo(robotEndX, robotEndY);
            ctxUI.strokeStyle = '#38bdf8';
            ctxUI.lineWidth = 3;
            ctxUI.stroke();
            
            // Vẽ LaserScan
            if (latestScan && document.getElementById('toggle-live-scan') && document.getElementById('toggle-live-scan').checked) {
                ctxUI.fillStyle = '#ef4444';
                const angle_min = latestScan.angle_min;
                const angle_inc = latestScan.angle_increment;
                const ranges = latestScan.ranges;
                
                for (let i = 0; i < ranges.length; i++) {
                    const r = ranges[i];
                    if (r < latestScan.range_min || r > latestScan.range_max) continue;
                    
                    const angle = robotHeading + angle_min + i * angle_inc;
                    const lx = robotMapX + r * Math.cos(angle);
                    const ly = robotMapY + r * Math.sin(angle);
                    
                    const px = mapToPixel(lx, ly);
                    const screenPx = pixelToScreen(px.x, px.y);
                    
                    ctxUI.fillRect(screenPx.x - 1, screenPx.y - 1, 2, 2);
                }
            }
        }

        let lastDrawTime = 0;
        let poseSubscriber = null;
        let msgCount = 0;
        let hzInterval = null;

        function subscribeToRobotPose() {
            if (!ros) return;
            if (poseSubscriber) {
                poseSubscriber.unsubscribe();
            }

            const topicName = document.getElementById('ros-pose-topic').value.trim();
            let msgType = 'geometry_msgs/PoseWithCovarianceStamped';
            if (topicName.includes('odom')) msgType = 'nav_msgs/Odometry';
            if (topicName.includes('scan')) msgType = 'sensor_msgs/LaserScan';

            poseSubscriber = new ROSLIB.Topic({
                ros: ros,
                name: topicName,
                messageType: msgType
            });

            // Calculate Hz
            if (hzInterval) clearInterval(hzInterval);
            msgCount = 0;
            document.getElementById('live-hz').innerText = '0 Hz';
            
            hzInterval = setInterval(() => {
                document.getElementById('live-hz').innerText = msgCount + ' Hz';
                if (msgCount === 0) {
                    document.getElementById('live-hz').style.color = '#ef4444'; // Red if no data
                } else {
                    document.getElementById('live-hz').style.color = '#10b981'; // Green if data flowing
                }
                msgCount = 0;
            }, 1000);

            poseSubscriber.subscribe(function (message) {
                msgCount++; // Increment message counter for Hz
                
                const now = Date.now();
                if (now - lastDrawTime > 500) {
                    if (msgType !== 'sensor_msgs/LaserScan') {
                        robotMapX = message.pose.pose.position.x;
                        robotMapY = message.pose.pose.position.y;
                        const q = message.pose.pose.orientation;
                        if(q) {
                            robotHeading = Math.atan2(2.0 * (q.w * q.z + q.x * q.y), 1.0 - 2.0 * (q.y * q.y + q.z * q.z));
                        }
                        
                        document.getElementById('live-rx').innerText = robotMapX.toFixed(3);
                        document.getElementById('live-ry').innerText = robotMapY.toFixed(3);
                        renderUI();
                    }
                    lastDrawTime = now;
                }
            });
        }

        let mapSubscriber = null;
        function toggleLiveMap() {
            if (!ros) return;
            const isChecked = document.getElementById('toggle-live-map').checked;
            if (!isChecked && mapSubscriber) {
                mapSubscriber.unsubscribe();
                mapSubscriber = null;
                return;
            }
            if (isChecked) {
                mapSubscriber = new ROSLIB.Topic({
                    ros: ros,
                    name: '/map',
                    messageType: 'nav_msgs/OccupancyGrid',
                    compression: 'png',
                    throttle_rate: 2000
                });
                mapSubscriber.subscribe((msg) => {
                    const info = msg.info;
                    RESOLUTION = info.resolution;
                    ORIGIN_X = info.origin.position.x;
                    ORIGIN_Y = info.origin.position.y;
                    IMAGE_WIDTH = info.width;
                    IMAGE_HEIGHT = info.height;
                    
                    document.getElementById('val-res').innerText = RESOLUTION.toFixed(3);
                    document.getElementById('val-ox').innerText = ORIGIN_X.toFixed(2);
                    document.getElementById('val-oy').innerText = ORIGIN_Y.toFixed(2);
                    document.getElementById('val-size').innerText = `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`;
                    
                    mapCanvas.width = IMAGE_WIDTH;
                    mapCanvas.height = IMAGE_HEIGHT;
                    
                    pgmImageData = ctxMap.createImageData(IMAGE_WIDTH, IMAGE_HEIGHT);
                    const data = pgmImageData.data;
                    const mapData = msg.data;
                    
                    for (let i = 0; i < mapData.length; i++) {
                        const x = i % IMAGE_WIDTH;
                        const y = Math.floor(i / IMAGE_WIDTH);
                        const flippedY = IMAGE_HEIGHT - 1 - y;
                        const idx = (flippedY * IMAGE_WIDTH + x) * 4;
                        
                        const val = mapData[i];
                        if (val === -1) {
                            data[idx] = 15; data[idx+1] = 23; data[idx+2] = 42; data[idx+3] = 255; // Unknown
                        } else if (val === 0) {
                            data[idx] = 51; data[idx+1] = 65; data[idx+2] = 85; data[idx+3] = 255; // Free space
                        } else if (val === 100) {
                            data[idx] = 56; data[idx+1] = 189; data[idx+2] = 248; data[idx+3] = 255; // Obstacle
                        } else {
                            const b = 51 + (val / 100.0) * 100;
                            data[idx] = b; data[idx+1] = b; data[idx+2] = b; data[idx+3] = 255;
                        }
                    }
                    ctxMap.putImageData(pgmImageData, 0, 0);
                    renderUI();
                });
            }
        }

        let scanSubscriber = null;
        let latestScan = null;
        function toggleLiveScan() {
            if (!ros) return;
            const isChecked = document.getElementById('toggle-live-scan').checked;
            if (!isChecked && scanSubscriber) {
                scanSubscriber.unsubscribe();
                scanSubscriber = null;
                latestScan = null;
                renderUI();
                return;
            }
            if (isChecked) {
                scanSubscriber = new ROSLIB.Topic({
                    ros: ros,
                    name: '/scan',
                    messageType: 'sensor_msgs/LaserScan',
                    throttle_rate: 200
                });
                scanSubscriber.subscribe((msg) => {
                    latestScan = msg;
                });
            }
        }

        document.getElementById('ros-pose-topic').addEventListener('change', subscribeToRobotPose);

        /** ==========================================
         * XUẤT FILE YAML (EXPORT MISSION)
         * ========================================== */
        function exportWaypointsYAML() {
            if (waypoints.length === 0) {
                alert("Bạn chưa đặt Waypoint nào trên bản đồ!");
                return;
            }

            let yamlContent = "waypoints:\n";
            waypoints.forEach((wp, idx) => {
                yamlContent += `  - id: ${idx}\n`;
                yamlContent += `    name: "${wp.name || 'Waypoint ' + (idx + 1)}"\n`;
                yamlContent += `    role: "${wp.role || 'ad'}"\n`;
                yamlContent += `    dwellTimeSeconds: ${wp.dwellTimeSeconds !== undefined ? wp.dwellTimeSeconds : 30}\n`;
                yamlContent += `    x: ${wp.x.toFixed(4)}\n`;
                yamlContent += `    y: ${wp.y.toFixed(4)}\n`;
                yamlContent += `    heading: ${(wp.heading || 0).toFixed(4)}\n`;
            });

            const blob = new Blob([yamlContent], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'mission_waypoints.yaml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }



