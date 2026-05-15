#!/usr/bin/env node
/**
 * Bulk-update products.json with full gallery images scraped from silkincom.com.
 * Each product gets all silkincom CDN images (jpg) found on its product page.
 */
const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'src', 'data', 'products.json');

// Scraped from silkincom.com — slug → array of Wix CDN media IDs (filename portion)
const GALLERY = {
  'bellagio-1': ['b58e91_6653f43860d34a5eb0143cae9523a134.jpg', 'b58e91_d9136bfd40e645f7a29a40572dacbd6c.jpg', 'b58e91_b47c2176cf494c6d9ebbffebd8a155e1.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio-2': ['b58e91_928bc5bd142f4b83b9add5ce3ef8ce12.jpg', 'b58e91_1ece6ac9317d4d14b44136fa852368c0.jpg', 'b58e91_cbbbb8ba1c874de08eb82dd6d0151b57.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio-3': ['b58e91_b7161595e0374515ab41e7e87fca0ee0.jpg', 'b58e91_99f339a4b5a9438d9f51c518d6e62871.jpg', 'b58e91_877d263e0d3d403585e5cd050d50f8d9.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio-4': ['b58e91_64aea6941447451496163f0df39b70eb.jpg', 'b58e91_6fa8a67dc30b47898c29a53a97cf8ba9.jpg', 'b58e91_5036826e5d434e168020cc267ab4128a.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio-5': ['b58e91_f148546deda948f198fd23fcec94eae9.jpg', 'b58e91_40b4dee5ec694a8f9683fed9d9039bc2.jpg', 'b58e91_21ad0f981c744192894cc4f81a726348.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio-6': ['b58e91_1e36b5e0abcf450eb59050f7b54164b3.jpg', 'b58e91_a9fc0b47c13a4cf3899ae174927dc60f.jpg', 'b58e91_2e07c6ecaa6b46b7b4754b6b7f9b1ad1.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'bellagio': ['b58e91_dad899cd51f3465c824c5e51b98b9126.jpg', 'b58e91_71ed161fcb154c1daa393933ebbf79be.jpg', 'b58e91_0031cb1649b248b2b7020250d22f9578.jpg', 'b58e91_d69a12c4bdbd4f7997959572bb5d2dca.jpg'],
  'cernobbio-azzurra': ['a34b56_3ccd9aefbaca4c5d9363c8711f5b3338.jpg', 'a34b56_eb2e3c191612431bb3b1d292052ffd5e.jpg', 'a34b56_d106ab4d693c47e3a078832873f338b4.jpg', 'a34b56_3837536df968488a861aa23b386ff9a5.jpg'],
  'cernobbio-beige': ['a34b56_0db62e090d464f1aa1065765bf6deb39.jpg', 'a34b56_04d0ca44cb5c480da8ebc8da2b13049c.jpg', 'a34b56_a375c2a7b9bb4bc19ac55c455b9ea04d.jpg', 'a34b56_440e284490344f159ffca94a5f501890.jpg'],
  'cernobbio-grigia': ['a34b56_e97ed96c800d485ebbbccdeb3642aa81.jpg', 'a34b56_1925c4363eee42ca9e52cd00897d01b9.jpg', 'a34b56_6c6eb75c6a71437fb576a67407c0e291.jpg', 'a34b56_be61360b671d470b8256186b632b8936.jpg'],
  'como-elegante': ['b58e91_6e113b7ba95f4d81854d2300b10860e8.jpg', 'b58e91_c295bb593a63419387c47ddc08389d9a.jpg', 'b58e91_d6c660d6ef61491983d531a70357c151.jpg', 'b58e91_6a64d06971e54676b9e55dcf4e6dde06.jpg'],
  'como-fluido': ['b58e91_9aaa42a940b94e2bb485ba65f9ee08ed.jpg', 'b58e91_7a6d384bafa44a3892eebdee03d47ba1.jpg', 'b58e91_01d2f1fd18c8446b99f0891bbdf6d262.jpg'],
  'como-leggero': ['b58e91_f121857550104fc08b32468ff37ea184.jpg', 'b58e91_e923df0963544e3396bfe367a0727a11.jpg', 'b58e91_a503c0ef171d4ee8b9b5353a52098211.jpg'],
  'como-puro': ['b58e91_7a44b8b49e5f4d34a23630e75cb6ecb5.jpg', 'b58e91_f43baec61b7244ca9aade809ce1544f6.jpg', 'b58e91_d54c571541674cbc8f2d67b47f39c9c5.jpg'],
  'como': ['b58e91_8229bdfa76db43309b20e568a18fdba0.jpg', 'b58e91_db26cf00039e473facd9cb600a269c6d.jpg', 'b58e91_513ef6d479114d8293dffb203dfeda52.jpg'],
  'darsena-bianco': ['a34b56_34e1b2f3c95e4fb8b28418f794d500d8.jpg', 'a34b56_3a1c36685f104db88a70b86aab6bdb32.jpg', 'a34b56_6ec58f896dbd466ca10626a919fd1792.jpg'],
  'darsena-blu': ['a34b56_e6f29e34a78940fb9c5a45e2d0e1833c.jpg', 'a34b56_f29bd444c24344cf89e44aaeac09d8ad.jpg', 'a34b56_77716b1be13a4c4787dfa3c2b5bd3ab5.jpg'],
  'darsena-navy': ['a34b56_b921b778e24c442a9a59be2c5e50ca27.jpg', 'a34b56_fafd83a6e8bb4e7caeeef8e5fda18815.jpg', 'a34b56_1dc311babfa34ae1b5d885e83c0aa038.jpg'],
  'darsena-nero': ['a34b56_4c95bebbb8a141b4a44c0340182bbe97.jpg', 'a34b56_e63d5884e7ab47fb94b4a06d591e71b0.jpg', 'a34b56_e2ae2948e10d4231ae75d1c540939a14.jpg'],
  'darsena-verde': ['a34b56_a8a624e8836841a78756d38d5067c2ff.jpg', 'a34b56_99972e2c9bc04bc1b8de6fb55b6d6b69.jpg'],
  'lario-1': ['a34b56_1c703913173a458d848ef300b9e954ba.jpg', 'a34b56_ad4ab8008b4348f9a6644618fbe196da.jpg', 'a34b56_b1575e0f6e2840c0aec436930f3bb069.jpg'],
  'lario': ['a34b56_34e1b2f3c95e4fb8b28418f794d500d8.jpg', 'a34b56_3a1c36685f104db88a70b86aab6bdb32.jpg'],
  'melzi-1': ['a34b56_4cdb7894efaa4a128d5fb0714b80e743.jpg', 'a34b56_f3beb31c3fd544c9a4f07406cbc02ec1.jpg', 'a34b56_a353f2a538d644b6a03b353da2598ce3.jpg', 'a34b56_101aeddee6eb4042becd6cedc32d56c9.jpg'],
  'melzi': ['a34b56_a341e8d4e66442e4bc33fcd2476368af.jpg', 'a34b56_3d6de74e8cff4949a9efcb940816c1b7.jpg', 'a34b56_c987c98ecd5c4b9f87a3e488e5cb3551.jpg'],
  'riva-1': ['a34b56_c17c8b8c3ed9469baee1b992666ad11b.jpg', 'a34b56_353fc6c152c54c92b7122a2d66a4b056.jpg', 'a34b56_e5eae4d9cb5d4c339f750a4cc664f224.jpg', 'a34b56_a5dcead5d5a1457fa28abbaf89150410.jpg'],
  'riva': ['a34b56_88c331613a2942d6bf9ac51c2f3f641c.jpg', 'a34b56_ad27d5ed3d8a48e3a3823544c7c44a7f.jpg', 'a34b56_4fc20e4ffe584df08f2acb3ad71c7103.jpg', 'a34b56_324357c2f40e4c5f92beceb17f0a4668.jpg'],
  'tivan': ['a34b56_7f5a6eb5f5ec474098fb2a72445ec974.jpg', 'a34b56_2819caf4309d41b09d65709cb98d5844.jpg', 'a34b56_3bc97dfdbc544b97b0e6f69051725537.jpg'],
  'tremezzo-azzurra': ['a34b56_1af2743a614c4ac1b255dd1e53c8f436.jpg', 'a34b56_617b1a8a1a9048fe9978f20c3742bdb9.jpg', 'a34b56_e0343df8ce364ab18a2f937d216c9781.jpg', 'a34b56_980f0ca238f44434b2ae164de871b781.jpg'],
  'tremezzo-beige': ['a34b56_9022b39ae7b347869e4dd45892fa018d.jpg', 'a34b56_c9742df13d9040d58ae7670e9b20c51e.jpg', 'a34b56_9071378a86854fa39ec14e4d646f2247.jpg', 'a34b56_15bea2cda78c44238624abd0ae4d9b67.jpg'],
  'tremezzo-bianca': ['a34b56_5cce86dc18864bee9519ea64ae991c8b.jpg', 'a34b56_a91960dbdcd94f4695bff746047a0604.jpg', 'a34b56_b22ee4b4e36f446d87a42bf693987890.jpg', 'a34b56_b1dd66be130e463087ce4b970b24da1b.jpg'],
  'tremezzo-nera': ['a34b56_1f7fc2378844448a9283c6bfdb26ae39.jpg', 'a34b56_3d646263cb8043fb9618b0f99fa8480d.jpg', 'a34b56_add35795742249b4be64fd87f6feef9c.jpg', 'a34b56_4b6ddadaf2f44ca1bee77465a0eef58a.jpg'],
  'tremezzo-rosa': ['a34b56_0218bc1eb1df48ef9acd0aecc91b068e.jpg', 'a34b56_281501c07bb549fc9fd8707b04aeedd7.jpg', 'a34b56_ae5892615e9a4fd98cd54a8cf69a9d40.jpg', 'a34b56_72e68e1dbdfe4fbbb02cd6dd94da8351.jpg'],
  'varenna-azzurra': ['a34b56_e76f0bb5106c49df8f2ef2b5d8602b0e.jpg', 'a34b56_87ba179b67414ed2af2b491235a5a4cc.jpg', 'a34b56_eb24e81623684a4f9562abecf72fb891.jpg', 'a34b56_923dbd68d59a42c4a2b48b504926911d.jpg'],
  'varenna-beige': ['a34b56_aeb0f1560658422586c12f4bcaba4409.jpg', 'a34b56_d75b183cbd8e4daeb85801d5d8b6d3f5.jpg', 'a34b56_a45fcb1f8b76467d9531c1ac304be305.jpg', 'a34b56_a51484dbb67b4942828e7124ff9d13a3.jpg'],
  'varenna-grigia': ['a34b56_6742414370ca400dab51b43a1d2e2f73.jpg', 'a34b56_bb7295de90964ba39f26f02ac6f57dcb.jpg', 'a34b56_7f8258d1ce084ac69bbd7c550a31e97e.jpg', 'a34b56_09e5b4b2628249d088bd1c78fe5ad14d.jpg'],
  'varenna-viola': ['a34b56_9f32bcd4e4c842bf9bf898d3fb1ff939.jpg', 'a34b56_75af23fe386c4fc8b2593d6d7f4bfef6.jpg', 'a34b56_dc182b8025914673a6c3a22705af9e9c.jpg', 'a34b56_087f8aea50074408894f3b47610f5e05.jpg'],
};

const wixURL = (id) => {
  const ext = id.endsWith('.png') ? 'png' : 'jpg';
  const base = id.replace(/\.(jpg|png)$/, '');
  return `https://static.wixstatic.com/media/${base}~mv2.${ext}/v1/fit/w_1200,h_1200,q_90/file.${ext}`;
};

const products = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
let updated = 0;
for (const p of products) {
  const ids = GALLERY[p.slug];
  if (!ids) {
    console.warn(`No gallery for ${p.slug}`);
    continue;
  }
  p.images = ids.map(wixURL);
  updated++;
}
fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
console.log(`Updated ${updated}/${products.length} products with ${Object.values(GALLERY).flat().length} total images.`);
