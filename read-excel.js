const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Ищем Excel файл в корне проекта
async function findExcelFile() {
    try {
        const files = await glob('*.xlsx', { cwd: __dirname });
        if (files.length === 0) {
            throw new Error('Excel файл не найден в корне проекта');
        }
        const excelFile = path.join(__dirname, files[0]);
        console.log(`📁 Найден файл: ${files[0]}\n`);
        return excelFile;
    } catch (error) {
        // Пробуем точное имя
        const exactFile = path.join(__dirname, '111102_12_Для_Графиков_Презентации_слайд_1.xlsx');
        if (fs.existsSync(exactFile)) {
            console.log(`📁 Используется файл: 111102_12_Для_Графиков_Презентации_слайд_1.xlsx\n`);
            return exactFile;
        }
        throw error;
    }
}

// Основная функция
async function readExcel() {
    try {
        const excelFile = await findExcelFile();

        // Читаем Excel файл
        const workbook = XLSX.readFile(excelFile);
    
        // Получаем список всех листов
        const sheetNames = workbook.SheetNames;
        console.log('Найденные листы:', sheetNames);
        console.log('\n' + '='.repeat(80) + '\n');
        
        // Обрабатываем каждый лист
        sheetNames.forEach((sheetName, index) => {
            console.log(`\n📊 Лист ${index + 1}: "${sheetName}"`);
            console.log('-'.repeat(80));
            
            const worksheet = workbook.Sheets[sheetName];
            
            // Конвертируем в JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1,  // Использовать массив массивов (сохраняет пустые ячейки)
                defval: ''  // Значение по умолчанию для пустых ячеек
            });
            
            // Выводим данные
            console.log('Данные (первые 20 строк):');
            jsonData.slice(0, 20).forEach((row, rowIndex) => {
                console.log(`Строка ${rowIndex + 1}:`, row);
            });
            
            if (jsonData.length > 20) {
                console.log(`... и еще ${jsonData.length - 20} строк`);
            }
            
            // Сохраняем в JSON файл
            const outputFile = path.join(__dirname, `data_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
            fs.writeFileSync(outputFile, JSON.stringify(jsonData, null, 2), 'utf8');
            console.log(`\n✅ Данные сохранены в: ${outputFile}`);
            
            // Также сохраняем в более читаемом формате (объекты)
            const jsonObjects = XLSX.utils.sheet_to_json(worksheet);
            const outputFileObjects = path.join(__dirname, `data_${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}_objects.json`);
            fs.writeFileSync(outputFileObjects, JSON.stringify(jsonObjects, null, 2), 'utf8');
            console.log(`✅ Данные (объекты) сохранены в: ${outputFileObjects}`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Обработка завершена!');
        
    } catch (error) {
        console.error('❌ Ошибка при чтении файла:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

// Запускаем функцию
readExcel();
