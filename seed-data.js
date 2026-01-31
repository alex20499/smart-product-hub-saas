import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量（无需dotenv）
const supabaseUrl = 'https://yxtakzmhxxyqwuppdbmh.supabase.co';
const supabaseKey = 'sb_publishable_CrlaPD-RdtOqt6IL0evQEA_P3nvCdjH';

const supabase = createClient(supabaseUrl, supabaseKey);

// 竞品数据 - 扩容到20条
const competitorData = [
  // 原有2条
  {
    id: 'p_shratch_b18',
    category_id: 'cat_powerbank',
    brand: 'SHRATCH',
    model: 'B18',
    channel: 'Yahoo Shopping',
    price: 2999,
    monthly_sales: 1500,
    rating: 4.43,
    attributes: {
      capacity_mah: 22000,
      weight_g: 200,
      interfaces: '集成3线+4台同充',
      selling_points: ['PSE认证', 'LCD残量显示', '防灾应急推荐'],
      pros: '大容量、コンパクト、デザインが良い',
      cons: '实容量偏低、Lightning线易断、充电到99%闪烁无法满电',
      raw_review: '充电到99%闪烁无法满电，这是关键痛点！',
      insight_summary: '容量虚标问题严重，充电逻辑存在缺陷，但设计感和便携性获得用户认可',
      link_url: 'https://shopping.yahoo.co.jp/products/shratch-b18',
      main_image: 'https://picsum.photos/seed/shratch-b18/400/400'
    }
  },
  {
    id: 'p_fiprin_7226set',
    category_id: 'cat_powerbank',
    brand: 'FIPRIN',
    model: '7226set',
    channel: 'Yahoo Shopping',
    price: 3680,
    monthly_sales: 2200,
    rating: 4.97,
    attributes: {
      capacity_mah: 10000,
      weight_g: 125,
      features: 'MagSafe磁吸、2个捆绑套装',
      selling_points: ['强磁力', 'Qi无线充', '停电对策', '口袋便携'],
      pros: '吸力强、出门不用带线',
      cons: '无线充发热、没有电量百分比显示',
      raw_review: '无线充发热严重，但没有电量显示更让人焦虑',
      insight_summary: '磁吸技术领先，但热管理和电量显示是明显短板，套装策略提升客单价',
      link_url: 'https://shopping.yahoo.co.jp/products/fiprin-7226set',
      main_image: 'https://picsum.photos/seed/fiprin-7226set/400/400'
    }
  },
  // Anker 系列
  {
    id: 'p_anker_737',
    category_id: 'cat_powerbank',
    brand: 'Anker',
    model: 'PowerCore 737',
    channel: 'Amazon',
    price: 4999,
    monthly_sales: 3500,
    rating: 4.65,
    attributes: {
      capacity_mah: 26800,
      weight_g: 450,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['氮化镓技术', '26800mAh超大容量', '60W双向快充'],
      pros: '充电速度快、容量实在、品质可靠',
      cons: '价格偏高、不支持某些私有协议、体积较大',
      raw_review: '氮化镓技术确实厉害，但价格真的有点贵，而且我的小米笔记本快充不兼容',
      insight_summary: '技术领先但价格门槛高，兼容性问题影响用户体验，适合对品质要求高的用户',
      link_url: 'https://amazon.com/dp/B0B7X7X7X7',
      main_image: 'https://picsum.photos/seed/anker-737/400/400'
    }
  },
  {
    id: 'p_anker_622',
    category_id: 'cat_powerbank',
    brand: 'Anker',
    model: 'PowerCore 622',
    channel: 'Rakuten',
    price: 3299,
    monthly_sales: 2800,
    rating: 4.52,
    attributes: {
      capacity_mah: 20000,
      weight_g: 350,
      interfaces: 'USB-C, USB-A',
      selling_points: ['PowerIQ 3.0', '22.5W快充', 'LED电量显示'],
      pros: '充电稳定、做工精细、品牌信任度高',
      cons: '比同容量竞品重、快充协议支持有限',
      raw_review: 'Anker的品质没得说，就是20000mAh这个重量有点超出预期',
      insight_summary: '品牌溢价明显，品质控制优秀，但在重量和价格竞争力方面有待提升',
      link_url: 'https://rakuten.co.jp/anker-622',
      main_image: 'https://picsum.photos/seed/anker-622/400/400'
    }
  },
  // UGREEN 系列
  {
    id: 'p_ugreen_20000',
    category_id: 'cat_powerbank',
    brand: 'UGREEN',
    model: '20000mAh Pro',
    channel: 'Amazon',
    price: 2499,
    monthly_sales: 4200,
    rating: 4.38,
    attributes: {
      capacity_mah: 20000,
      weight_g: 380,
      interfaces: 'USB-C x2, USB-A x2, Micro-USB',
      selling_points: ['红点设计奖', '三口同充', '数字显示屏'],
      pros: '外观设计漂亮、接口丰富、性价比高',
      cons: '表面易刮花、充电效率一般、塑料感较强',
      raw_review: '红点奖的设计确实好看，但是用了两个月表面就有刮痕了，有点失望',
      insight_summary: '设计驱动产品，外观优势明显但材质和耐用性需要改进，适合注重颜值的用户',
      link_url: 'https://amazon.com/dp/B0U7G7X7X7',
      main_image: 'https://picsum.photos/seed/ugreen-20000/400/400'
    }
  },
  {
    id: 'p_ugreen_10000',
    category_id: 'cat_powerbank',
    brand: 'UGREEN',
    model: '10000mAh Slim',
    channel: 'Rakuten',
    price: 1599,
    monthly_sales: 3100,
    rating: 4.45,
    attributes: {
      capacity_mah: 10000,
      weight_g: 180,
      interfaces: 'USB-C, USB-A',
      selling_points: ['超薄设计', '18W快充', '金属外壳'],
      pros: '便携性好、金属质感、快充稳定',
      cons: '容量虚标、发热明显、接口较少',
      raw_review: '很薄很轻便，但是实际容量感觉不到10000mAh，充电时还有点发热',
      insight_summary: '便携性优势突出，但容量准确性和散热控制是短板，适合追求轻薄的用户',
      link_url: 'https://rakuten.co.jp/ugreen-10000',
      main_image: 'https://picsum.photos/seed/ugreen-10000/400/400'
    }
  },
  // Belkin 系列
  {
    id: 'p_belkin_boostcharge',
    category_id: 'cat_powerbank',
    brand: 'Belkin',
    model: 'BoostCharge Pro',
    channel: 'Amazon',
    price: 4499,
    monthly_sales: 1900,
    rating: 4.71,
    attributes: {
      capacity_mah: 20000,
      weight_g: 400,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['MFi认证', '45W快充', 'MagSafe兼容'],
      pros: '苹果认证、充电安全、做工优秀',
      cons: '价格昂贵、容量一般、体积较大',
      raw_review: 'Belkin的品质确实好，MFi认证用着放心，就是价格真的不便宜',
      insight_summary: '苹果生态用户首选，安全性和兼容性优势明显，但价格竞争力不足',
      link_url: 'https://amazon.com/dp/B0B8L8L8L8',
      main_image: 'https://picsum.photos/seed/belkin-boostcharge/400/400'
    }
  },
  {
    id: 'p_belkin_magsafe',
    category_id: 'cat_powerbank',
    brand: 'Belkin',
    model: 'MagSafe 5000',
    channel: 'Rakuten',
    price: 3999,
    monthly_sales: 1600,
    rating: 4.68,
    attributes: {
      capacity_mah: 5000,
      weight_g: 150,
      interfaces: 'USB-C, MagSafe',
      selling_points: ['MagSafe磁吸', '超薄设计', 'LED指示灯'],
      pros: '磁吸力强、iPhone完美适配、便携性极佳',
      cons: '容量小、价格高、只适合iPhone',
      raw_review: 'iPhone用户必备，磁吸很稳，就是5000mAh有点不够用',
      insight_summary: 'iPhone专用配件，磁吸体验优秀但容量和性价比是硬伤，适合iPhone重度用户',
      link_url: 'https://rakuten.co.jp/belkin-magsafe',
      main_image: 'https://picsum.photos/seed/belkin-magsafe/400/400'
    }
  },
  // 白牌竞品系列
  {
    id: 'p_amazon_choice_1',
    category_id: 'cat_powerbank',
    brand: 'Amazon Choice',
    model: 'Ultra 30000',
    channel: 'Amazon',
    price: 1999,
    monthly_sales: 5800,
    rating: 4.12,
    attributes: {
      capacity_mah: 30000,
      weight_g: 550,
      interfaces: 'USB-C x3, USB-A x3, Micro-USB',
      selling_points: ['极致性价比', '自带四线', '超大容量'],
      pros: '价格便宜、容量大、接口多、送充电线',
      cons: '发热严重、转化率只有60%、做工粗糙',
      raw_review: '这个价格能买到30000mAh确实便宜，但是充电时发热很严重，感觉有点危险',
      insight_summary: '价格杀手，容量和接口优势明显，但安全性和效率是重大隐患，适合预算敏感用户',
      link_url: 'https://amazon.com/dp/B0A9X9X9X9',
      main_image: 'https://picsum.photos/seed/amazon-choice-30000/400/400'
    }
  },
  {
    id: 'p_amazon_choice_2',
    category_id: 'cat_powerbank',
    brand: 'Amazon Choice',
    model: 'Slim 10000',
    channel: 'Amazon',
    price: 999,
    monthly_sales: 7200,
    rating: 3.95,
    attributes: {
      capacity_mah: 10000,
      weight_g: 160,
      interfaces: 'USB-C, USB-A',
      selling_points: ['超低价', '超薄设计', 'LED显示'],
      pros: '便宜、轻便、外观还行',
      cons: '容量虚标严重、充电慢、寿命短',
      raw_review: '1000块钱买个10000mAh，便宜是便宜，但是感觉实际容量只有6000左右',
      insight_summary: '极致性价比产品，价格优势巨大但质量和性能问题严重，适合短期使用或预算极度有限用户',
      link_url: 'https://amazon.com/dp/B0B0Y0Y0Y0',
      main_image: 'https://picsum.photos/seed/amazon-choice-10000/400/400'
    }
  },
  {
    id: 'p_white_label_1',
    category_id: 'cat_powerbank',
    brand: 'PowerMax',
    model: 'Pro 20000',
    channel: 'Rakuten',
    price: 1299,
    monthly_sales: 4500,
    rating: 4.08,
    attributes: {
      capacity_mah: 20000,
      weight_g: 420,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['白牌性价比', '大容量', '快充支持'],
      pros: '价格便宜、容量大、充电速度快',
      cons: '品质不稳定、售后无保障、安全隐患',
      raw_review: '用了一个月就坏了，便宜没好货这句话是真的',
      insight_summary: '典型白牌产品，价格和容量优势明显但质量和售后是硬伤，适合追求极致性价比的用户',
      link_url: 'https://rakuten.co.jp/powermax-pro',
      main_image: 'https://picsum.photos/seed/powermax-pro/400/400'
    }
  },
  {
    id: 'p_white_label_2',
    category_id: 'cat_powerbank',
    brand: 'SuperCharge',
    model: 'Mag 15000',
    channel: 'Amazon',
    price: 1599,
    monthly_sales: 3800,
    rating: 4.25,
    attributes: {
      capacity_mah: 15000,
      weight_g: 280,
      interfaces: 'USB-C, USB-A, MagSafe兼容',
      selling_points: ['磁吸功能', '中等容量', '价格实惠'],
      pros: '有磁吸、价格合理、容量适中',
      cons: '磁吸力弱、充电效率低、做工一般',
      raw_review: '磁吸功能有是有，但是吸力很弱，稍微动一下就掉了',
      insight_summary: '磁吸功能入门级产品，价格优势明显但体验不佳，适合想体验磁吸但预算有限的用户',
      link_url: 'https://amazon.com/dp/B0C1Z1Z1Z1',
      main_image: 'https://picsum.photos/seed/supercharge-mag/400/400'
    }
  },
  // 更多品牌
  {
    id: 'p_xiaomi_20000',
    category_id: 'cat_powerbank',
    brand: 'Xiaomi',
    model: 'Mi Power Bank 3',
    channel: 'Rakuten',
    price: 2299,
    monthly_sales: 4100,
    rating: 4.48,
    attributes: {
      capacity_mah: 20000,
      weight_g: 380,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['小米生态', '快充协议', '高性价比'],
      pros: '性价比高、快充稳定、小米设备兼容好',
      cons: '塑料感强、发热明显、非小米设备快充慢',
      raw_review: '小米设备用着很爽，但是给苹果充电就慢了很多',
      insight_summary: '小米生态用户首选，性价比和兼容性优势明显，但跨品牌体验一般',
      link_url: 'https://rakuten.co.jp/xiaomi-20000',
      main_image: 'https://picsum.photos/seed/xiaomi-20000/400/400'
    }
  },
  {
    id: 'p_samsung_25000',
    category_id: 'cat_powerbank',
    brand: 'Samsung',
    model: 'Super Fast 25K',
    channel: 'Amazon',
    price: 3799,
    monthly_sales: 2600,
    rating: 4.62,
    attributes: {
      capacity_mah: 25000,
      weight_g: 450,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['Super Fast Charging', '25W快充', '三星品质'],
      pros: '充电速度快、品质可靠、三星设备完美适配',
      cons: '价格偏高、体积较大、非三星设备兼容性一般',
      raw_review: '三星手机用着确实快，但是给其他品牌充电就没那么快了',
      insight_summary: '三星生态用户优选，快充体验优秀但价格和通用性是短板',
      link_url: 'https://amazon.com/dp/B0D2A2A2A2',
      main_image: 'https://picsum.photos/seed/samsung-25000/400/400'
    }
  },
  {
    id: 'p_razer_15000',
    category_id: 'cat_powerbank',
    brand: 'Razer',
    model: 'Chroma 15000',
    channel: 'Amazon',
    price: 4299,
    monthly_sales: 1400,
    rating: 4.55,
    attributes: {
      capacity_mah: 15000,
      weight_g: 320,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['RGB灯效', '游戏优化', '18W快充'],
      pros: '灯效酷炫、游戏优化、做工精良',
      cons: '价格昂贵、RGB耗电、容量一般',
      raw_review: 'RGB确实好看，但是开灯会消耗电量，而且价格真的不便宜',
      insight_summary: '游戏玩家专属，RGB体验独特但性价比一般，适合追求个性化的游戏用户',
      link_url: 'https://amazon.com/dp/B0E3B3B3B3',
      main_image: 'https://picsum.photos/seed/razer-15000/400/400'
    }
  },
  {
    id: 'p_baseus_20000',
    category_id: 'cat_powerbank',
    brand: 'Baseus',
    model: 'Adaman 20000',
    channel: 'Rakuten',
    price: 1799,
    monthly_sales: 5200,
    rating: 4.28,
    attributes: {
      capacity_mah: 20000,
      weight_g: 390,
      interfaces: 'USB-C x2, USB-A x2',
      selling_points: ['数字显示', '22.5W快充', '性价比高'],
      pros: '价格便宜、数字显示实用、快充稳定',
      cons: '做工一般、容量虚标、耐用性差',
      raw_review: '数字显示很方便，但是用了半年容量就衰减了很多',
      insight_summary: '性价比导向产品，功能实用但品质控制一般，适合预算有限但需要数字显示的用户',
      link_url: 'https://rakuten.co.jp/baseus-20000',
      main_image: 'https://picsum.photos/seed/baseus-20000/400/400'
    }
  },
  {
    id: 'p_aukey_12000',
    category_id: 'cat_powerbank',
    brand: 'Aukey',
    model: 'PowerCore 12000',
    channel: 'Amazon',
    price: 1399,
    monthly_sales: 3400,
    rating: 4.18,
    attributes: {
      capacity_mah: 12000,
      weight_g: 260,
      interfaces: 'USB-C, USB-A x2',
      selling_points: ['小体积', '18W快充', 'LED指示'],
      pros: '体积小巧、价格便宜、接口够用',
      cons: '容量偏小、充电效率一般、品质不稳定',
      raw_review: '体积确实小，但是12000mAh感觉实际容量只有8000左右',
      insight_summary: '便携性导向产品，体积优势明显但容量准确性和品质控制有待提升',
      link_url: 'https://amazon.com/dp/B0F4C4C4C4',
      main_image: 'https://picsum.photos/seed/aukey-12000/400/400'
    }
  }
];

// 品类模板数据 - 根据实际数据库结构
const categoryTemplates = [
  {
    category_id: 'cat_powerbank',
    field_key: 'selling_points',
    field_name: '卖点数组',
    field_type: 'text',
    is_required: false,
    options: null,
    sort_order: 100,
    is_active: true
  },
  {
    category_id: 'cat_powerbank',
    field_key: 'pros',
    field_name: '好评词云',
    field_type: 'text',
    is_required: false,
    options: null,
    sort_order: 101,
    is_active: true
  },
  {
    category_id: 'cat_powerbank',
    field_key: 'cons',
    field_name: '差评词云',
    field_type: 'text',
    is_required: false,
    options: null,
    sort_order: 102,
    is_active: true
  },
  {
    category_id: 'cat_powerbank',
    field_key: 'raw_review',
    field_name: '典型原句',
    field_type: 'text',
    is_required: false,
    options: null,
    sort_order: 103,
    is_active: true
  },
  {
    category_id: 'cat_powerbank',
    field_key: 'insight_summary',
    field_name: '专家洞察',
    field_type: 'text',
    is_required: false,
    options: null,
    sort_order: 104,
    is_active: true
  }
];

// 品类数据
const categories = [
  {
    id: 'cat_powerbank',
    name: '移动电源',
    description: '便携式充电设备，包含各种容量和规格的移动电源产品',
    icon: 'battery-charging'
  }
];

async function seedData() {
  console.log('🚀 开始注入数据...');
  
  try {
    // 1. 插入品类数据
    console.log('📁 插入品类数据...');
    for (const category of categories) {
      const { error } = await supabase
        .from('categories')
        .upsert(category, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ 插入品类失败: ${error.message}`);
        throw error;
      }
    }
    console.log('✅ 品类数据插入成功');
    
    // 2. 插入品类模板数据
    console.log('📋 插入品类模板数据...');
    for (const template of categoryTemplates) {
      const { error } = await supabase
        .from('category_templates')
        .upsert(template, { onConflict: 'category_id,field_key' });
      
      if (error) {
        console.error(`❌ 插入模板失败: ${error.message}`);
        throw error;
      }
    }
    console.log('✅ 品类模板数据插入成功');
    
    // 3. 插入产品数据
    console.log('📦 插入竞品数据...');
    for (const product of competitorData) {
      const { error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ 插入产品失败: ${error.message}`);
        throw error;
      }
    }
    console.log('✅ 竞品数据插入成功');
    
    // 4. 验证数据
    console.log('🔍 验证注入数据...');
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, brand, model, price, rating')
      .in('id', ['p_shratch_b18', 'p_fiprin_7226set']);
    
    if (fetchError) {
      console.error(`❌ 验证数据失败: ${fetchError.message}`);
      throw fetchError;
    }
    
    console.log('✅ 数据验证成功！');
    console.log('📊 注入的产品数据:');
    products.forEach(product => {
      console.log(`   - ${product.brand} ${product.model} | ¥${product.price} | ⭐${product.rating}`);
    });
    
    console.log('\n🎉 数据已注入！共注入 2 条竞品数据和 5 条模板数据');
    
  } catch (error) {
    console.error('❌ 数据注入失败:', error.message);
    process.exit(1);
  }
}

// 执行数据注入
seedData();
