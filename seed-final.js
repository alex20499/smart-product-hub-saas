import { createClient } from '@supabase/supabase-js';

// 直接使用环境变量（无需dotenv）
const supabaseUrl = 'https://yxtakzmhxxyqwuppdbmh.supabase.co';
const supabaseKey = 'sb_publishable_CrlaPD-RdtOqt6IL0evQEA_P3nvCdjH';

const supabase = createClient(supabaseUrl, supabaseKey);

// 竞品数据 - 只包含核心字段
const competitorData = [
  {
    id: 'p_shratch_b18',
    category_id: 'cat_powerbank',
    brand: 'SHRATCH',
    model: 'B18',
    channel: 'Yahoo Shopping',
    price: 2999,
    monthly_sales: 1500,
    rating: 4.43,
    main_image: 'https://picsum.photos/seed/shratch-b18/400/400',
    attributes: {
      capacity_mah: 22000,
      weight_g: 200,
      interfaces: '集成3线+4台同充',
      selling_points: ['PSE认证', 'LCD残量显示', '防灾应急推荐'],
      pros: '大容量、コンパクト、デザインが良い',
      cons: '实容量偏低、Lightning线易断、充电到99%闪烁无法满电',
      raw_review: '充电到99%闪烁无法满电，这是关键痛点！',
      insight_summary: '容量虚标问题严重，充电逻辑存在缺陷，但设计感和便携性获得用户认可',
      link_url: 'https://shopping.yahoo.co.jp/products/shratch-b18'
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
    main_image: 'https://picsum.photos/seed/fiprin-7226set/400/400',
    attributes: {
      capacity_mah: 10000,
      weight_g: 125,
      features: 'MagSafe磁吸、2个捆绑套装',
      selling_points: ['强磁力', 'Qi无线充', '停电对策', '口袋便携'],
      pros: '吸力强、出门不用带线',
      cons: '无线充发热、没有电量百分比显示',
      raw_review: '无线充发热严重，但没有电量显示更让人焦虑',
      insight_summary: '磁吸技术领先，但热管理和电量显示是明显短板，套装策略提升客单价',
      link_url: 'https://shopping.yahoo.co.jp/products/fiprin-7226set'
    }
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
    
    // 2. 插入产品数据
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
    
    // 3. 验证数据
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
    
    // 4. 检查总产品数量
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`❌ 统计产品数量失败: ${countError.message}`);
    } else {
      console.log(`📈 数据库中现有产品总数: ${count} 条`);
    }
    
    console.log('\n🎉 数据注入完成！现在可以在前端查看 SHRATCH B18 的详细情报了');
    
  } catch (error) {
    console.error('❌ 数据注入失败:', error.message);
    process.exit(1);
  }
}

// 执行数据注入
seedData();
