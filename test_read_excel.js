const ExcelJS = require('exceljs');

async function readExcel() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(process.argv[2]);

    const worksheet = workbook.worksheets[0];
    const data = [];
    worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
        data.push(row.values);
    });
    console.log(JSON.stringify(data, null, 2));
}

readExcel().catch(console.error);
