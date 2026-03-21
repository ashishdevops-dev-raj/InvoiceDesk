const itemsBody = document.getElementById("itemsBody");
const rowTemplate = document.getElementById("rowTemplate");
const addRowBtn = document.getElementById("addRowBtn");
const sampleBtn = document.getElementById("sampleBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const taxableTotalEl = document.getElementById("taxableTotal");
const gstTotalEl = document.getElementById("gstTotal");
const grandTotalEl = document.getElementById("grandTotal");

function num(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createRow(data = {}) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");

  row.querySelector(".product").value = data.product || "";
  row.querySelector(".pack").value = data.pack ?? 12;
  row.querySelector(".hsn").value = data.hsn || "210690";
  row.querySelector(".mrp").value = data.mrp ?? 20;
  row.querySelector(".qty").value = data.qty ?? 3;
  row.querySelector(".unit").value = data.unit || "BOX";
  row.querySelector(".free").value = data.free ?? 0;
  row.querySelector(".rate").value = data.rate ?? 1491.6;
  row.querySelector(".disc").value = data.disc ?? 0;
  row.querySelector(".gst").value = data.gst ?? 5;

  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", recalculateAll);
  });

  row.querySelector(".deleteBtn").addEventListener("click", () => {
    row.remove();
    recalculateAll();
  });

  itemsBody.appendChild(fragment);
  recalculateAll();
}

function recalculateRow(row) {
  const qty = num(row.querySelector(".qty").value);
  const rate = num(row.querySelector(".rate").value);
  const disc = num(row.querySelector(".disc").value);
  const gst = num(row.querySelector(".gst").value);

  const gross = qty * rate;
  const discountAmount = (gross * disc) / 100;
  const taxable = gross - discountAmount;
  const gstAmt = (taxable * gst) / 100;
  const amount = taxable + gstAmt;

  row.querySelector(".taxableCell").textContent = taxable.toFixed(2);
  row.querySelector(".gstAmtCell").textContent = gstAmt.toFixed(2);
  row.querySelector(".amountCell").textContent = amount.toFixed(2);

  return { taxable, gstAmt, amount };
}

function recalculateAll() {
  const rows = [...itemsBody.querySelectorAll("tr")];
  let taxableTotal = 0;
  let gstTotal = 0;
  let grandTotal = 0;

  rows.forEach((row, idx) => {
    row.querySelector(".rowNo").textContent = idx + 1;
    const values = recalculateRow(row);
    taxableTotal += values.taxable;
    gstTotal += values.gstAmt;
    grandTotal += values.amount;
  });

  taxableTotalEl.textContent = taxableTotal.toFixed(2);
  gstTotalEl.textContent = gstTotal.toFixed(2);
  grandTotalEl.textContent = grandTotal.toFixed(2);
}

function loadSampleItems() {
  itemsBody.innerHTML = "";
  const sample = [
    { product: "UCO FS 1/0", pack: 180, hsn: "210690", mrp: 10, qty: 3, unit: "BOX", rate: 1491.6, disc: 2, gst: 5 },
    { product: "KK MASALA MUNCH", pack: 90, hsn: "210690", mrp: 20, qty: 3, unit: "BOX", rate: 1908.58, disc: 0, gst: 5 },
    { product: "LAY'S CLASSIC", pack: 120, hsn: "210690", mrp: 20, qty: 2, unit: "BOX", rate: 1514.43, disc: 0, gst: 5 },
    { product: "KK CURRY CHATKA", pack: 90, hsn: "210690", mrp: 20, qty: 3, unit: "BOX", rate: 4022.86, disc: 0, gst: 5 },
    { product: "CC STYLE", pack: 120, hsn: "210690", mrp: 20, qty: 5, unit: "BOX", rate: 2011.43, disc: 0, gst: 5 }
  ];
  sample.forEach((item) => createRow(item));
}

addRowBtn.addEventListener("click", () => createRow());
sampleBtn.addEventListener("click", loadSampleItems);
downloadPdfBtn.addEventListener("click", () => {
  if (typeof html2pdf === "undefined") {
    alert("PDF library is not loaded. Please check internet and reload page.");
    return;
  }

  const invoiceNo = document.getElementById("invoiceNo").value.trim() || "invoice";
  const fileName = `GST-Invoice-${invoiceNo}.pdf`;
  const pageElement = document.querySelector(".page");
  const hideElements = document.querySelectorAll(".no-print");

  hideElements.forEach((element) => {
    element.dataset.prevDisplay = element.style.display;
    element.style.display = "none";
  });

  const options = {
    margin: 8,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf()
    .set(options)
    .from(pageElement)
    .save()
    .finally(() => {
      hideElements.forEach((element) => {
        element.style.display = element.dataset.prevDisplay || "";
        delete element.dataset.prevDisplay;
      });
    });
});

const today = new Date().toISOString().split("T")[0];
document.getElementById("invoiceDate").value = today;
document.getElementById("dueDate").value = today;

createRow({
  product: "Sample Item",
  pack: 120,
  hsn: "210690",
  mrp: 20,
  qty: 3,
  unit: "BOX",
  free: 0,
  rate: 1491.6,
  disc: 0,
  gst: 5
});
