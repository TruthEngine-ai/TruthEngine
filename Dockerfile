# 使用Python官方镜像作为基础镜像
FROM python:3.10

# 设置工作目录
WORKDIR /app

# 复制requirements.txt（如果有的话）
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口（根据您的应用调整）
EXPOSE 8000

# 设置启动命令
CMD ["fastapi", "dev", "main.py"]
