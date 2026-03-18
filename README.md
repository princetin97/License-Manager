# 🛡️ License Manager - Hệ thống Quản trị License

[![Deployment: Docker](https://img.shields.io/badge/Deployment-Docker-blue?logo=docker&style=flat-package)](https://www.docker.com/) 
[![Node.js: 20](https://img.shields.io/badge/Node.js-20-green?logo=node.js&style=flat-package)](https://nodejs.org/)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite-lightgrey?logo=sqlite&style=flat-package)](https://www.sqlite.org/)

Hệ thống quản trị tập trung các dịch vụ phần mềm, tên miền, và hợp đồng (License). Tối ưu hóa cho việc theo dõi gia hạn, quản trị chi phí bộ phận và tự động hóa thông báo qua Email hàng tháng.

---

## ✨ Tính năng nổi bật

-   **Dashboard Trực quan**: Biểu đồ phân bổ chi phí theo phòng ban và dự báo gia hạn trong 6 tháng tới.
-   **Tự động hóa Email**: Hệ thống tự động quét và gửi danh sách các License sắp hết hạn (trong vòng 3 tháng) vào ngày cố định hàng tháng.
-   **Cấu hình SMTP Linh hoạt**: Giao diện cài đặt SMTP trực tiếp trên ứng dụng, hỗ trợ xem trước (Preview) biểu mẫu mail.
-   **Quản lý Phân quyền**: Hỗ trợ 3 vai trò người dùng: Admin, Manager, và Viewer.
-   **Bảo mật**: Mật khẩu quản trị viên được mã hóa, hỗ trợ đổi mật khẩu trực tiếp.
-   **Thiết kế hiện đại**: UI/UX dựa trên TailwindCSS, mượt mà và hỗ trợ hiển thị trên nhiều thiết kế màn hình.

---

## 🚀 Hướng dẫn Triển khai trên Ubuntu 22.04

### 1. Yêu cầu hệ thống
-   **Docker** & **Docker Compose** (Khuyên dùng Docker phiên bản mới nhất).
-   **Port 5000** (hoặc port tùy chỉnh trong `docker-compose.yml`).

### 2. Cài đặt Docker (Nếu chưa có)
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3. Triển khai ứng dụng
Tải toàn bộ mã nguồn về máy chủ Ubuntu, truy cập thư mục dự án và chạy duy nhất lệnh sau:

```bash
docker compose up -d --build
```

-   Docker sẽ tự động khởi tạo ổ đĩa mang tên `license_data` để lưu trữ file SQLite bền vững.
-   Lưu ý: Ứng dụng đã được cấu hình chạy bằng quyền **root** để tránh hoàn toàn các lỗi phân quyền ghi file trên Ubuntu.

### 4. Truy cập
Mở trình duyệt: `http://<dia-chi-ip-server>:5000`
-   **Tài khoản mặc định**: `admin`
-   **Mật khẩu mặc định**: `admin`

---

## ⚙️ Cấu hình Gửi Email (SMTP)

Để kích hoạt tính năng thông báo tự động hàng tháng:
1. Đăng nhập vào hệ thống dưới quyền Admin.
2. Truy cập tab **Cài đặt**.
3. Điền thông tin máy chủ Mail (VD: Gmail App Password, MISA Mail SMTP...).
4. Nhấn **Gửi thử Mail** để kiểm tra giao diện và kết nối thực tế.
5. Nhấn **Lưu áp dụng** để kích hoạt lịch quét và gửi tự động.

---

## 🛠️ Quản trị & Sao lưu

-   **Xem logs**: `docker compose logs -f`
-   **Dừng hệ thống**: `docker compose down`
-   **Sao lưu cơ sở dữ liệu**:
    Dữ liệu được lưu trong Docker volume mang tên `license_data`. Để tìm thư mục vật lý chứa file trên Ubuntu, bạn dùng lệnh:
    ```bash
    docker volume inspect license-manager_license_data
    ```

---

## 🔒 Security Note
-   Khuyến cáo đổi mật khẩu Admin ngay sau khi đăng nhập lần đầu.
-   Các tệp tin `.db` đã được cấu hình trong `.gitignore` để không bị đẩy lên GitHub/Version Control công cộng.

---

**Phát triển bởi Đội ngũ Công nghệ - 2024**
