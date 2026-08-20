import os

files_to_translate = [
    'public/ros-test.html',
    'public/ros-map-tool.html'
]

translations = {
    '1. CONNECT TO ROBOT (ROS 2)': '1. KẾT NỐI ROBOT (ROS 2)',
    'Boot Mode:': 'Chế độ Boot:',
    'SLAM (Mapping)': 'SLAM (Vẽ Bản Đồ)',
    'AMCL (Static Map)': 'AMCL (Bản Đồ Tĩnh)',
    'Save Map': 'Lưu Bản Đồ',
    'Disconnect': 'Ngắt Kết Nối',
    'OS Status:': 'Trạng thái OS:',
    'WS Status:': 'Trạng thái WS:',
    'Upload Map to Robot (AMCL)': 'Tải Bản Đồ Lên Robot (AMCL)',
    'Upload to Robot': 'Tải Lên Robot',
    '3. NAVIGATION CONTROL': '3. ĐIỀU KHIỂN ĐIỀU HƯỚNG',
    'Pan Map': 'Kéo Bản Đồ',
    'Initial Pose': 'Vị Trí Ban Đầu',
    'Nav Goal': 'Mục Tiêu Di Chuyển',
    'ROS Map X:': 'Tọa độ X:',
    'ROS Map Y:': 'Tọa độ Y:',
    'MAP PARAMETERS': 'THÔNG SỐ BẢN ĐỒ',
    'Resolution': 'Độ phân giải',
    'Origin X': 'Gốc X',
    'Origin Y': 'Gốc Y',
    'Image Size': 'Kích thước Ảnh',
    'Zoom Level': 'Mức Thu phóng',
    '4. ROBOT TELEMETRY (ROS 2)': '4. THÔNG TIN ROBOT (ROS 2)',
    'Pose Topic:': 'Topic Vị trí:',
    '(Wheels)': '(Bánh xe)',
    '(Raw)': '(Thô)',
    '(Freq Check Only)': '(Chỉ Kiểm tra Tần số)',
    'Live X:': 'Vị trí X:',
    'Live Y:': 'Vị trí Y:',
    'Freq:': 'Tần số:',
    'Show Live Map (/map)': 'Hiện Bản Đồ Trực Tiếp (/map)',
    'Show Live Scan (/scan)': 'Hiện Quét Trực Tiếp (/scan)',
    'Waiting for ROS 2 connection...': 'Đang chờ kết nối ROS 2...',
    'Map Uploaded to Robot!': 'Đã tải Bản Đồ lên Robot!',
    'Upload failed:': 'Tải lên thất bại:',
    'Please select BOTH the .yaml and .pgm file to upload to the robot.': 'Vui lòng chọn CẢ HAI file .yaml và .pgm để tải lên robot.',
    'Need one .yaml and one .pgm file.': 'Cần một file .yaml và một file .pgm.',
    'Map saved successfully to Pi!': 'Đã lưu Bản Đồ thành công vào Pi!',
    'Map save failed:': 'Lưu Bản Đồ thất bại:',
    'Success: ': 'Thành công: ',
    'Files have also been downloaded to your laptop.': 'Các file cũng đã được tải xuống laptop của bạn.',
    'Failed to contact Agent Server to save map': 'Không thể kết nối với Agent Server để lưu bản đồ',
    'Error: ': 'Lỗi: ',
    'Uploading to robot...': 'Đang tải lên robot...',
    'Disconnected': 'Đã ngắt kết nối',
    'Running': 'Đang chạy',
    'Connecting...': 'Đang kết nối...',
    'Connected': 'Đã kết nối',
    '>Connect<': '>Kết Nối<',
    '>Boot<': '>Khởi động<',
    '>Stop<': '>Dừng<'
}

for filepath in files_to_translate:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for en, vi in translations.items():
        content = content.replace(en, vi)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Translation applied successfully!")
