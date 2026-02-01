-- ========================================
-- 智能产品中心 SaaS - 完整数据库设置
-- 一键设置所有必要的表和数据
-- ========================================

-- 1. 清理旧数据（安全起见）
DROP TABLE IF EXISTS category_templates CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. 创建用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建品类表
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建品类模板表（核心：动态字段支持）
CREATE TABLE category_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'url', 'image', 'textarea', 
        'rating', 'select', 'date', 'multi_select_quantity'
    )),
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    options JSONB,
    validation_rules JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(category_id, field_key)
);

-- 5. 创建产品表
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    
    -- 核心固定字段
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    channel TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    monthly_sales INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    main_image TEXT,
    link_url TEXT,
    shop_name TEXT,
    actual_price DECIMAL(10,2),
    
    -- 动态字段存储
    attributes JSONB DEFAULT '{}',
    
    -- 元数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id)
);

-- 6. 插入初始用户数据
INSERT INTO users (username, password, role, email) VALUES
('admin', 'password', 'admin', 'admin@example.com'),
('editor', 'password', 'editor', 'editor@example.com'),
('viewer', 'password', 'viewer', 'viewer@example.com');

-- 7. 插入基础品类数据
INSERT INTO categories (id, name, description, sort_order) VALUES
('cat_powerbank', '充电宝', '移动电源和充电设备', 1),
('cat_earbuds', '蓝牙耳机', '无线音频设备', 2),
('cat_smartwatch', '智能手表', '可穿戴智能设备', 3),
('cat_laptop', '笔记本电脑', '便携计算设备', 4),
('cat_phone', '智能手机', '移动通信设备', 5);

-- 8. 插入品类模板数据
INSERT INTO category_templates (category_id, field_key, field_name, field_type, is_required, sort_order, options) VALUES
-- 充电宝品类
('cat_powerbank', 'capacity_mah', '容量(mAh)', 'number', true, 1, NULL),
('cat_powerbank', 'fast_charging', '快充协议', 'multi_select_quantity', false, 2, '["PD", "QC", "SCP", "FCP"]'),
('cat_powerbank', 'weight_g', '重量(g)', 'number', false, 3, NULL),
('cat_powerbank', 'dimensions', '尺寸(mm)', 'text', false, 4, NULL),
('cat_powerbank', 'led_display', 'LED显示', 'select', false, 5, '["有", "无"]'),

-- 蓝牙耳机品类  
('cat_earbuds', 'battery_life', '续航时间(h)', 'number', true, 1, NULL),
('cat_earbuds', 'bluetooth_version', '蓝牙版本', 'select', false, 2, '["5.0", "5.1", "5.2", "5.3"]'),
('cat_earbuds', 'noise_cancelling', '降噪功能', 'select', false, 3, '["主动降噪", "被动降噪", "无"]'),
('cat_earbuds', 'water_resistance', '防水等级', 'select', false, 4, '["IPX4", "IPX5", "IPX7", "IP68"]'),
('cat_earbuds', 'driver_size', '驱动单元(mm)', 'number', false, 5, NULL),

-- 智能手表品类
('cat_smartwatch', 'screen_size', '屏幕尺寸(英寸)', 'number', true, 1, NULL),
('cat_smartwatch', 'compatibility', '兼容系统', 'multi_select_quantity', false, 2, '["iOS", "Android", "HarmonyOS"]'),
('cat_smartwatch', 'health_features', '健康功能', 'multi_select_quantity', false, 3, '["心率监测", "血氧监测", "睡眠监测", "运动追踪"]'),
('cat_smartwatch', 'battery_days', '续航天数', 'number', false, 4, NULL),
('cat_smartwatch', 'water_resistance', '防水等级', 'select', false, 5, '["30m", "50m", "100m", "200m"]'),

-- 笔记本电脑品类
('cat_laptop', 'cpu_model', '处理器型号', 'text', true, 1, NULL),
('cat_laptop', 'ram_gb', '内存(GB)', 'number', true, 2, NULL),
('cat_laptop', 'storage_gb', '存储(GB)', 'number', true, 3, NULL),
('cat_laptop', 'screen_size', '屏幕尺寸(英寸)', 'number', false, 4, NULL),
('cat_laptop', 'weight_kg', '重量(kg)', 'number', false, 5, NULL),
('cat_laptop', 'graphics_card', '显卡', 'text', false, 6, NULL),

-- 智能手机品类
('cat_phone', 'screen_size', '屏幕尺寸(英寸)', 'number', true, 1, NULL),
('cat_phone', 'ram_gb', '内存(GB)', 'number', true, 2, NULL),
('cat_phone', 'storage_gb', '存储(GB)', 'number', true, 3, NULL),
('cat_phone', 'camera_mp', '摄像头(万像素)', 'number', false, 4, NULL),
('cat_phone', 'battery_mah', '电池容量(mAh)', 'number', false, 5, NULL),
('cat_phone', 'network_5g', '5G网络', 'select', false, 6, '["支持", "不支持"]');

-- 9. 创建性能索引
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_channel ON products(channel);
CREATE INDEX idx_category_templates_category_id ON category_templates(category_id);
CREATE INDEX idx_category_templates_active ON category_templates(is_active, category_id);
CREATE INDEX idx_users_username ON users(username);

-- 10. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_category_templates_updated_at BEFORE UPDATE ON category_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 验证设置结果
SELECT '=== 用户数据 ===' as info;
SELECT id, username, role, created_at FROM users ORDER BY role, username;

SELECT '=== 品类数据 ===' as info;
SELECT id, name, description, sort_order FROM categories ORDER BY sort_order;

SELECT '=== 模板数据统计 ===' as info;
SELECT 
    c.id,
    c.name,
    COUNT(ct.id) as template_count
FROM categories c
LEFT JOIN category_templates ct ON c.id = ct.category_id
WHERE c.is_active = true
GROUP BY c.id, c.name
ORDER BY c.sort_order;

SELECT '=== 数据库设置完成 ===' as info;
SELECT NOW() as setup_completed_at;
