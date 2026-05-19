import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const rootDir = path.resolve(".");
const sourcePath = path.join(rootDir, "pages/index/index.js");
const outputDir = path.join(rootDir, "outputs/bird-copy-export");
const outputPath = path.join(outputDir, "30只鸟鸟签文案.xlsx");

const source = await fs.readFile(sourcePath, "utf8");
const match = source.match(/const rawBirds = \[([\s\S]*?)\n\];/);
if (!match) {
  throw new Error("Could not find rawBirds in pages/index/index.js");
}

const rawBirds = Function(`"use strict"; const rawBirds = [${match[1]}\n]; return rawBirds;`)();

function heatNumber(text) {
  const value = Number(String(text).replace("万", ""));
  return Number.isFinite(value) ? value : "";
}

function stars(value) {
  return "★★★★★".slice(0, value) + "☆☆☆☆☆".slice(0, 5 - value);
}

function rangeA1(colCount, rowCount) {
  const letters = [];
  let n = colCount;
  while (n > 0) {
    const mod = (n - 1) % 26;
    letters.unshift(String.fromCharCode(65 + mod));
    n = Math.floor((n - 1) / 26);
  }
  return `A1:${letters.join("")}${rowCount}`;
}

const workbook = Workbook.create();
const copySheet = workbook.worksheets.add("鸟签文案总表");
const reviewSheet = workbook.worksheets.add("运营校对视图");
const noteSheet = workbook.worksheets.add("字段说明");

const copyHeaders = [
  "排名",
  "鸟类ID",
  "鸟类中文名",
  "标签热度",
  "标签热度数值(万)",
  "热榜标签",
  "外观关键词",
  "习性/介绍",
  "今日鸟签文案",
  "觅食/水域亲和",
  "社交活跃",
  "行动力/会议状态",
  "图片资产路径",
  "开发备注"
];

const copyRows = rawBirds
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map((bird) => [
    bird.rank,
    bird.id,
    bird.name,
    bird.heat,
    heatNumber(bird.heat),
    bird.rarity,
    bird.look,
    bird.line,
    bird.quote,
    `${stars(bird.fish)} (${bird.fish}/5)`,
    `${stars(bird.social)} (${bird.social}/5)`,
    `${stars(bird.meeting)} (${bird.meeting}/5)`,
    `/assets/birds-final/${bird.id}.png`,
    ""
  ]);

copySheet.getRange(rangeA1(copyHeaders.length, copyRows.length + 1)).values = [copyHeaders, ...copyRows];

const reviewHeaders = [
  "排名",
  "鸟类",
  "热度",
  "核心识别点",
  "内容人设/精神状态",
  "面向用户文案",
  "校对状态",
  "修改建议"
];

const reviewRows = rawBirds
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map((bird) => [
    bird.rank,
    bird.name,
    bird.heat,
    bird.look,
    bird.line,
    bird.quote,
    "",
    ""
  ]);

reviewSheet.getRange(rangeA1(reviewHeaders.length, reviewRows.length + 1)).values = [reviewHeaders, ...reviewRows];

const noteRows = [
  ["文件用途", "30 只鸟的鸟签文案、外观关键词和运营校对字段导出"],
  ["数据来源", "pages/index/index.js 中 rawBirds 数据"],
  ["导出时间", new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })],
  ["说明", "“标签热度数值(万)”为便于排序和筛选的数值列；文案原文保留在“今日鸟签文案”。"],
  ["校对建议", "建议先在“运营校对视图”中标记校对状态和修改建议，再回填到小程序数据源。"]
];
noteSheet.getRange(`A1:B${noteRows.length}`).values = noteRows;

function styleSheet(sheet, lastCol, lastRow, widths) {
  const full = sheet.getRange(rangeA1(lastCol, lastRow));
  full.format = {
    font: { name: "PingFang SC", size: 10, color: "#1f2933" },
    fill: "#fbfbf6",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "inside", style: "thin", color: "#e5e7df" }
  };

  const header = sheet.getRange(`A1:${rangeA1(lastCol, 1).split(":")[1]}`);
  header.format = {
    fill: "#174a35",
    font: { name: "PingFang SC", size: 10, color: "#ffffff", bold: true },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: "#174a35" }
  };

  sheet.getRange(`A1:A${lastRow}`).format.horizontalAlignment = "center";
  sheet.getRange(`D2:D${lastRow}`).format.horizontalAlignment = "center";
  sheet.getRange(`E2:E${lastRow}`).format.horizontalAlignment = "right";
  sheet.getRange(`J2:L${lastRow}`).format.horizontalAlignment = "center";
  sheet.getRange(`A1:${rangeA1(lastCol, 1).split(":")[1]}`).format.rowHeightPx = 38;
  sheet.getRange(`A2:${rangeA1(lastCol, lastRow).split(":")[1]}`).format.rowHeightPx = 48;
  sheet.freezePanes.freezeRows(1);

  widths.forEach((width, index) => {
    const columnLetter = rangeA1(index + 1, 1).split(":")[1].replace("1", "");
    sheet.getRange(`${columnLetter}:${columnLetter}`).format.columnWidthPx = width;
  });
}

styleSheet(copySheet, copyHeaders.length, copyRows.length + 1, [
  56, 140, 100, 92, 120, 92, 160, 260, 300, 122, 110, 132, 230, 180
]);

styleSheet(reviewSheet, reviewHeaders.length, reviewRows.length + 1, [
  56, 110, 92, 160, 260, 300, 110, 260
]);

noteSheet.getRange("A1:B5").format = {
  font: { name: "PingFang SC", size: 10, color: "#1f2933" },
  fill: "#fbfbf6",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "inside", style: "thin", color: "#e5e7df" }
};
noteSheet.getRange("A1:A5").format = {
  fill: "#e7efe8",
  font: { name: "PingFang SC", size: 10, color: "#174a35", bold: true },
  horizontalAlignment: "center"
};
noteSheet.getRange("A:A").format.columnWidthPx = 120;
noteSheet.getRange("B:B").format.columnWidthPx = 560;
noteSheet.getRange("A1:B5").format.rowHeightPx = 34;

await fs.mkdir(outputDir, { recursive: true });

const summary = await workbook.inspect({
  kind: "table",
  range: "鸟签文案总表!A1:N8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 14
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan"
});
console.log(errors.ndjson);

await workbook.render({ sheetName: "鸟签文案总表", range: "A1:N12", scale: 1 });
await workbook.render({ sheetName: "运营校对视图", range: "A1:H12", scale: 1 });
await workbook.render({ sheetName: "字段说明", range: "A1:B5", scale: 1 });

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`saved:${outputPath}`);
