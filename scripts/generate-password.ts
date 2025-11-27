import * as argon2 from 'argon2';

/**
 * 生成密码哈希的辅助脚本
 * 使用方法: npx ts-node scripts/generate-password.ts
 */

async function generatePassword() {
  const password = 'admin123'; // 默认密码

  console.log('\n正在生成密码哈希...\n');

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log('密码:', password);
  console.log('哈希值:', hash);
  console.log('\n请将此哈希值复制到 init-database.sql 文件的 passwordHash 字段中\n');
}

generatePassword().catch(console.error);
