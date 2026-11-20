/* Импорт спрайтов юнитов из DroneFlames PC Port (github.com/makkaX2/DroneFlames-PC-Port)
   Вырезает нужные спрайты из атласов (ads/sprites/atlas_*.png + .json) в assets/units/*.png
   и генерирует js/data/sprites.js.

   Запуск:  cd tools && node import-df.js
   Требует: папка tools/df с atlas_*.png и atlas_*.json (скачивается скриптом fetch-df.sh) */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DF = path.join(__dirname, 'df');
const OUT = path.join(__dirname, '..', 'assets', 'units');

// тип юнита в игре -> [атлас, имя спрайта, масштаб отрисовки]
const MAP = [
  ['inf', 'atlas_world7', 'infantry', 1.0],
  ['tank', 'atlas_units314', 'tank_a_L', 1.0],
  ['art', 'atlas_units314', 'howitzer', 1.0],
  ['drone', 'atlas_world2', 'uav_delta', 1.0],
  ['jet', 'atlas_air316', 'attack', 0.9],
  ['ship', 'atlas_navy1', 'ship_light', 1.0],
  ['sam', 'atlas_units314', 'ad_sam_s', 1.0],
  ['base', 'atlas_world6', 'ad_radar', 1.0],
  ['nuke', 'atlas_world3', 'missile', 1.0],
];

// города: наборы домиков по регионам (из атласов dmg314)
const TOWNS = {
  west: ['atlas_dmg314_west', ['west:house_a', 'west:house_c', 'west:house_b', 'west:stalinka_h', 'west:school']],
  east: ['atlas_dmg314_east', ['house_a', 'house_c', 'house_b', 'stalinka_h', 'khrushchevka_h']],
  asia: ['atlas_dmg314_asia', ['asia:house_a', 'asia:house_c', 'asia:house_b', 'asia:stalinka_h', 'asia:school']],
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const meta = {};
  for (const [type, atlas, name, scale] of MAP) {
    const json = JSON.parse(fs.readFileSync(path.join(DF, atlas + '.json'), 'utf8'));
    const s = json.sprites[name];
    if (!s) { console.warn('нет спрайта', atlas, name); continue; }
    const frames = s.frames || 1;
    const w = s.w, h = s.h;
    const png = path.join(DF, atlas + '.png');
    const file = path.join(OUT, type + '.png');
    await sharp(png)
      .extract({ left: s.x, top: s.y, width: w * frames, height: h })
      .png({ compressionLevel: 9 })
      .toFile(file);
    // иконка для кнопок: нулевой кадр, увеличенный x4 (пиксель-арт)
    await sharp(png)
      .extract({ left: s.x, top: s.y, width: w, height: h })
      .resize({ width: w * 4, height: h * 4, kernel: 'nearest' })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, type + '_icon.png'));
    meta[type] = { src: 'assets/units/' + type + '.png', icon: 'assets/units/' + type + '_icon.png', w, h, frames, ax: s.ax, ay: s.ay, scale };
    console.log(type.padEnd(6), (atlas + '/' + name).padEnd(34), w + 'x' + h, 'кадров', frames, (fs.statSync(file).size / 1024).toFixed(1) + 'КБ');
  }
  // --- города ---
  meta.town = {};
  for (const set of Object.keys(TOWNS)) {
    const [atlas, names] = TOWNS[set];
    const json = JSON.parse(fs.readFileSync(path.join(DF, atlas + '.json'), 'utf8'));
    meta.town[set] = [];
    for (let i = 0; i < names.length; i++) {
      const key = Object.keys(json.sprites).filter(k => k.indexOf(names[i] + '#d1') === 0 || k === names[i])[0];
      const sp = key && json.sprites[key];
      if (!sp) { console.warn('нет здания', names[i]); continue; }
      const file = path.join(OUT, 'town_' + set + '_' + i + '.png');
      await sharp(path.join(DF, atlas + '.png'))
        .extract({ left: sp.x, top: sp.y, width: sp.w, height: sp.h })
        .png({ compressionLevel: 9 })
        .toFile(file);
      meta.town[set].push({ src: 'assets/units/town_' + set + '_' + i + '.png', w: sp.w, h: sp.h });
    }
    console.log('город', set.padEnd(5), meta.town[set].length, 'зданий');
  }

  const out = '/* Спрайты юнитов: DroneFlames PC Port (makkaX2/DroneFlames-PC-Port), некоммерческое использование */\n' +
    'window.SPRITE_DATA = ' + JSON.stringify(meta, null, 2).replace(/"(\w+)":/g, '$1:') + ';\n';
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'data', 'sprites.js'), out);
  console.log('готово:', Object.keys(meta).length, 'спрайтов');
})();
