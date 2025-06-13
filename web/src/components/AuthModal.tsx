import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { register, type LoginRequest, type RegisterRequest } from '../api/authApi';


interface AuthModalProps {
  open: boolean;
  onCancel: () => void;
  defaultTab?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onCancel, defaultTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const handleLogin = async (values: LoginRequest) => {
    try {
      setLoginLoading(true);
      await login(values);
      message.success('登录成功！');
      loginForm.resetFields();
      onCancel();
    } catch (error: any) {
      console.error('登录失败:', error);
      message.error(error?.data?.detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values: RegisterRequest) => {
    try {
      setRegisterLoading(true);
      const response = await register(values);
      if (response.code === 200) {
        message.success('注册成功！请登录');
        registerForm.resetFields();
        setActiveTab('login');
      } else {
        message.error(response.msg || '注册失败');
      }
    } catch (error: any) {
      console.error('注册失败:', error);
      message.error(error?.data?.detail || '注册失败，请稍后重试');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCancel = () => {
    loginForm.resetFields();
    registerForm.resetFields();
    setActiveTab('login');
    onCancel();
  };

  const loginTab = (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loginLoading}
          block
        >
          登录
        </Button>
      </Form.Item>
    </Form>
  );

  const registerTab = (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' },
          { max: 20, message: '用户名最多20个字符' }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="用户名"
        />
      </Form.Item>

      <Form.Item
        name="nickname"
        rules={[
          { required: true, message: '请输入昵称' },
          { max: 50, message: '姓名最多50个字符' }
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="昵称"
        />
      </Form.Item>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="邮箱"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="密码"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="确认密码"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={registerLoading}
          block
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  );

  const items = [
    {
      key: 'login',
      label: '登录',
      children: loginTab,
    },
    {
      key: 'register',
      label: '注册',
      children: registerTab,
    },
  ];

  return (
    <Modal
      title="账号登录"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={400}
      centered
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'login' | 'register')}
        items={items}
        centered
      />
    </Modal>
  );
};

export default AuthModal;
