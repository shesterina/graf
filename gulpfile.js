const gulp = require('gulp');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const plumber = require('gulp-plumber');
const browserSync = require('browser-sync').create();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { glob } = require('glob');

// Обработчик ошибок для предотвращения прерывания процесса
function onError(err) {
  console.error('\n❌ ОШИБКА:', err.message);
  if (err.stack) {
    console.error('Stack trace:', err.stack);
  }
  this.emit('end'); // Продолжаем выполнение
}

// Пути к файлам
const paths = {
  html: {
    src: 'src/**/*.html',
    dest: 'dist/'
  },
  scss: {
    src: 'src/scss/**/*.scss',
    dest: 'dist/css/'
  },
  js: {
    src: 'src/js/**/*.js',
    dest: 'dist/js/'
  },
  images: {
    src: 'src/images/**/*',
    dest: 'dist/images/'
  },
  echarts: {
    src: 'node_modules/echarts/dist/echarts.min.js',
    dest: 'dist/js/libs/'
  },
  echartsGl: {
    src: 'node_modules/echarts-gl/dist/echarts-gl.min.js',
    dest: 'dist/js/libs/'
  }
};

// Задача для компиляции SCSS
async function styles() {
  try {
    // Убеждаемся, что папка назначения существует
    if (!fs.existsSync(paths.scss.dest)) {
      fs.mkdirSync(paths.scss.dest, { recursive: true });
    }
    
    const files = await glob(paths.scss.src);
    
    if (files.length === 0) {
      console.warn('⚠ Предупреждение: SCSS файлы не найдены');
      return;
    }
    
    for (const fileName of files) {
      const fileNameWithoutExtension = path.basename(fileName, path.extname(fileName));
      const outputPath = path.join(paths.scss.dest, fileNameWithoutExtension + '.css');
      const command = `sass --update --no-source-map --style=expanded "${fileName}":"${outputPath}"`;
      
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log(stdout.trim());
        if (stderr && !stderr.includes('Deprecation')) {
          console.warn('⚠ Предупреждение:', stderr.trim());
        }
        console.log(`✓ Скомпилирован: ${path.basename(fileName)} -> ${path.basename(outputPath)}`);
      } catch (error) {
        console.error(`\n✗ Ошибка компиляции ${path.basename(fileName)}:`);
        console.error(`  ${error.message}`);
        if (error.stdout) console.error(`  Вывод: ${error.stdout}`);
        if (error.stderr) console.error(`  Ошибки: ${error.stderr}`);
        // Продолжаем обработку других файлов
      }
    }
    
    browserSync.reload('*.css');
  } catch (error) {
    console.error('\n❌ Критическая ошибка в задаче styles:', error.message);
    // Не прерываем процесс
  }
}

// Задача для минификации CSS (для production)
async function stylesMin() {
  try {
    // Убеждаемся, что папка назначения существует
    if (!fs.existsSync(paths.scss.dest)) {
      fs.mkdirSync(paths.scss.dest, { recursive: true });
    }
    
    const files = await glob(paths.scss.src);
    
    if (files.length === 0) {
      console.warn('⚠ Предупреждение: SCSS файлы не найдены');
      return;
    }
    
    for (const fileName of files) {
      const fileNameWithoutExtension = path.basename(fileName, path.extname(fileName));
      const outputDir = paths.scss.dest;
      const cssFile = path.join(outputDir, fileNameWithoutExtension + '.css');
      const minCssFile = path.join(outputDir, fileNameWithoutExtension + '.min.css');
      
      try {
        // Сначала компилируем SCSS в CSS
        await execAsync(`sass --update --no-source-map --style=expanded "${fileName}":"${cssFile}"`);
        console.log(`✓ Скомпилирован: ${path.basename(fileName)} -> ${path.basename(cssFile)}`);
        
        // Затем обрабатываем через PostCSS
        await execAsync(`postcss --no-map "${cssFile}" --use autoprefixer postcss-sort-media-queries cssnano --output "${minCssFile}"`);
        console.log(`✓ Минифицирован: ${path.basename(cssFile)} -> ${path.basename(minCssFile)}`);
      } catch (error) {
        console.error(`\n✗ Ошибка обработки ${path.basename(fileName)}:`);
        console.error(`  ${error.message}`);
        if (error.stdout) console.error(`  Вывод: ${error.stdout}`);
        if (error.stderr) console.error(`  Ошибки: ${error.stderr}`);
        // Продолжаем обработку других файлов
      }
    }
  } catch (error) {
    console.error('\n❌ Критическая ошибка в задаче stylesMin:', error.message);
    // Не прерываем процесс
  }
}

// Задача для обработки JavaScript
function scripts() {
  return gulp.src(paths.js.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка обработки JavaScript:', err.message);
      this.emit('end');
    })
    .pipe(gulp.dest(paths.js.dest))
    .pipe(browserSync.stream());
}

// Задача для минификации JS (для production)
function scriptsMin() {
  return gulp.src(paths.js.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка минификации JavaScript:', err.message);
      this.emit('end');
    })
    .pipe(uglify().on('error', function(err) {
      console.error('\n✗ Ошибка Uglify:', err.message);
      this.emit('end');
    }))
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.js.dest))
    .on('error', function(err) {
      console.error('\n✗ Ошибка записи файла:', err.message);
      this.emit('end');
    });
}

// Задача для копирования HTML
function html() {
  return gulp.src(paths.html.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка обработки HTML:', err.message);
      this.emit('end');
    })
    .pipe(gulp.dest(paths.html.dest))
    .pipe(browserSync.stream());
}

// Задача для копирования изображений
function images() {
  return gulp.src(paths.images.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка обработки изображений:', err.message);
      this.emit('end');
    })
    .pipe(gulp.dest(paths.images.dest))
    .pipe(browserSync.stream());
}

// Задача для копирования ECharts
function echarts() {
  // Убеждаемся, что папка назначения существует
  if (!fs.existsSync(paths.echarts.dest)) {
    fs.mkdirSync(paths.echarts.dest, { recursive: true });
  }
  
  return gulp.src(paths.echarts.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка копирования ECharts:', err.message);
      console.error('  Убедитесь, что выполнен: npm install');
      this.emit('end');
    })
    .pipe(gulp.dest(paths.echarts.dest))
    .on('end', function() {
      console.log('✓ ECharts скопирован в dist/js/libs/');
    })
    .pipe(browserSync.stream());
}

// Задача для копирования ECharts GL
function echartsGl() {
  // Убеждаемся, что папка назначения существует
  if (!fs.existsSync(paths.echartsGl.dest)) {
    fs.mkdirSync(paths.echartsGl.dest, { recursive: true });
  }
  
  return gulp.src(paths.echartsGl.src)
    .pipe(plumber({ errorHandler: onError }))
    .on('error', function(err) {
      console.error('\n✗ Ошибка копирования ECharts GL:', err.message);
      console.error('  Убедитесь, что выполнен: npm install');
      this.emit('end');
    })
    .pipe(gulp.dest(paths.echartsGl.dest))
    .on('end', function() {
      console.log('✓ ECharts GL скопирован в dist/js/libs/');
    })
    .pipe(browserSync.stream());
}

// Задача для запуска BrowserSync
function serve() {
  browserSync.init({
    server: {
      baseDir: './dist'
    },
    port: 3000,
    notify: false
  });

  // Отслеживание изменений с обработкой ошибок
  gulp.watch(paths.scss.src, styles).on('error', function(err) {
    console.error('\n✗ Ошибка в watch для SCSS:', err.message);
  });
  
  gulp.watch(paths.js.src, scripts).on('error', function(err) {
    console.error('\n✗ Ошибка в watch для JS:', err.message);
  });
  
  gulp.watch(paths.html.src, html).on('error', function(err) {
    console.error('\n✗ Ошибка в watch для HTML:', err.message);
  });
  
  gulp.watch(paths.images.src, images).on('error', function(err) {
    console.error('\n✗ Ошибка в watch для изображений:', err.message);
  });
}

// Задача для сборки проекта (production)
const build = gulp.series(
  gulp.parallel(html, stylesMin, scriptsMin, images, echarts, echartsGl)
);

// Задача по умолчанию (development)
const dev = gulp.series(
  gulp.parallel(html, styles, scripts, images, echarts, echartsGl),
  serve
);

// Экспорт задач
exports.styles = styles;
exports.scripts = scripts;
exports.html = html;
exports.images = images;
exports.echarts = echarts;
exports.echartsGl = echartsGl;
exports.serve = serve;
exports.build = build;
exports.default = dev;

