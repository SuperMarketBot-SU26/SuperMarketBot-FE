# ROS 2 Foxglove Bridge Setup Guide

Hướng dẫn cài đặt và chạy `foxglove_bridge` trên **Raspberry Pi 5** (Ubuntu 22.04 / ROS 2 Humble).

---

## Kiến trúc

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  ESP32-S3       │  USB    │  Raspberry Pi 5   │   WS    │  React Frontend │
│  (Robot MCU)    │ ─────── │  (ROS 2 Humble)   │ ──────> │  FleetMap.jsx   │
│                 │         │                  │          │  (Foxglove WS)  │
│  YDLIDAR X3     │  UART   │  slam_toolbox    │          │                 │
│  (LiDAR)        │ ───────>│  foxglove_bridge │          │                 │
└─────────────────┘         └──────────────────┘          └─────────────────┘
```

---

## Bước 1: Cài đặt ROS 2 Humble (Nếu chưa có)

```bash
# Cài đặt Ubuntu 22.04 Server trên Raspberry Pi 5

# 1. Thêm ROS 2 GPG key
sudo apt update && sudo apt install curl gnupg lsb-release
sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key | sudo gpg --dearmor -o /usr/share/keyrings/ros-archive-keyring.gpg

# 2. Thêm repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null

# 3. Cài đặt ROS 2 Humble
sudo apt update
sudo apt install ros-humble-ros-base ros-humble-twist-mux ros-humble-nav2 ros-humble-slam-toolbox

# 4. Source ROS 2
echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc
source ~/.bashrc
```

---

## Bước 2: Cài đặt Foxglove Bridge

```bash
# Cài đặt foxglove_bridge từ source hoặc binary

# Option A: Cài đặt qua apt (Khuyến nghị)
sudo apt update
sudo apt install ros-humble-foxglove-bridge

# Option B: Build from source (Nếu cần custom)
# mkdir -p ~/ros2_ws/src
# cd ~/ros2_ws/src
# git clone https://github.com/foxglove/ros2-foxglove-bridge.git
# cd ~/ros2_ws && colcon build --packages-select foxglove_bridge
# source install/setup.bash
```

---

## Bước 3: Chạy Foxglove Bridge với SLAM

```bash
# Tạo launch file hoặc chạy trực tiếp

# === Method 1: Chạy đơn lẻ (Terminal riêng) ===

# Terminal 1: Chạy SLAM (slam_toolbox)
ros2 launch slam_toolbox online_async.launch.py \
    use_sim_time:=false \
    map_frame:=map \
    base_frame:=base_link \
    scan_topic:=/scan

# Terminal 2: Chạy Foxglove Bridge
ros2 run foxglove_bridge foxglove_bridge \
    --ros-args \
    -p port:=8765 \
    -p address:=0.0.0.0 \
    -p topic_whitelist:="['/scan', '/map', '/odom', '/tf', '/cmd_vel']" \
    -p param_whitelist:="['.*']"

# === Method 2: Launch file (Khuyến nghị) ===
# Tạo file ~/ros2_ws/src/smartmarketbot/launch/robot_bridge.launch.py

cat > ~/ros2_ws/src/smartmarketbot/launch/robot_bridge.launch.py << 'EOF'
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        # SLAM Toolbox
        Node(
            package='slam_toolbox',
            executable='online_async_launch.py',
            name='slam_toolbox',
            output='screen',
            parameters=[{
                'use_sim_time': False,
                'map_frame': 'map',
                'base_frame': 'base_link',
                'scan_topic': '/scan',
            }]
        ),
        
        # Foxglove Bridge
        Node(
            package='foxglove_bridge',
            executable='foxglove_bridge',
            name='foxglove_bridge',
            output='screen',
            parameters=[{
                'port': 8765,
                'address': '0.0.0.0',
                'topic_whitelist': ['/scan', '/map', '/odom', '/tf', '/cmd_vel'],
            }]
        ),
    ])
EOF

# Chạy launch file
ros2 launch smartmarketbot robot_bridge.launch.py
```

---

## Bước 4: Kiểm tra kết nối

```bash
# 1. Kiểm tra Foxglove Bridge đang chạy
ros2 topic list | grep -E "(scan|map|odom|tf)"

# 2. Test WebSocket connection
# Mở trình duyệt và truy cập:
# ws://<PI_IP>:8765
# Ví dụ: ws://192.168.0.100:8765

# 3. Kiểm tra port đang mở
sudo ss -tlnp | grep 8765
```

---

## Cấu hình Firewall (Nếu cần)

```bash
# Mở port 8765 cho WebSocket
sudo ufw allow 8765/tcp

# Hoặc tắt firewall tạm thời (Không khuyến nghị cho production)
sudo ufw disable
```

---

## Cấu hình WiFi Static IP cho Pi 5

```bash
# /etc/netplan/50-cloud-init.yaml
network:
  version: 2
  ethernets:
    wlan0:
      addresses:
        - 192.168.0.100/24
      gateway4: 192.168.0.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
      access-points:
        "YOUR_WIFI_SSID":
          password: "YOUR_WIFI_PASSWORD"
```

---

## Troubleshooting

### Lỗi: "Connection refused"
```bash
# Kiểm tra foxglove_bridge đang chạy
ps aux | grep foxglove_bridge

# Khởi động lại
ros2 run foxglove_bridge foxglove_bridge --ros-args -p port:=8765
```

### Lỗi: "No map data"
```bash
# Đảm bảo slam_toolbox đang chạy và nhận được /scan
ros2 topic echo /scan --once

# Kiểm tra map được publish
ros2 topic hz /map
```

### Lỗi: "WebSocket blocked"
- Đảm bảo frontend kết nối qua `ws://` không phải `wss://`
- Kiểm tra CORS settings trong foxglove_bridge

---

## Frontend Configuration

Trong React Frontend, cấu hình kết nối ROS:

```javascript
// src/features/robot/hooks/useRosConnection.js
const DEFAULT_CONFIG = {
  ROBOT_IP: '192.168.0.100',  // IP của Raspberry Pi 5
  FOXGLOVE_PORT: 8765,
  RECONNECT_INTERVAL_MS: 3000,
};

// Sử dụng trong FleetMap.jsx
<FleetMap
  robotIp="192.168.0.100"
  foxglovePort={8765}
  enableRosBridge={true}
/>
```

---

## Performance Tips

1. **Giảm tần số scan** nếu network chậm:
   ```bash
   ros2 run foxglove_bridge foxglove_bridge \
       -p topic_rate_frequencyDivider:=2  # Giảm 50%
   ```

2. **Chỉ subscribe topics cần thiết**:
   ```bash
   -p topic_whitelist:=['/scan', '/map']
   ```

3. **Tắt các topic không cần** trong slam_toolbox

---

## Security Notes

⚠️ **Production**: Bảo mật WebSocket endpoint:
- Sử dụng `wss://` thay vì `ws://`
- Thêm authentication middleware
- Firewall chỉ mở port cho IP frontend

---

## Support

- Foxglove Bridge Docs: https://docs.foxglove.dev/docs/connect/ros2/foxglove-bridge
- ROS 2 Humble: https://docs.ros.org/en/humble/
