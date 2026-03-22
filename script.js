const itemsBody = document.getElementById("itemsBody");
const rowTemplate = document.getElementById("rowTemplate");
const addRowBtn = document.getElementById("addRowBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const subTotalEl = document.getElementById("subTotal");
const sgstTotalEl = document.getElementById("sgstTotal");
const cgstTotalEl = document.getElementById("cgstTotal");
const roundOffEl = document.getElementById("roundOff");
const grandTotalEl = document.getElementById("grandTotal");

const PDF_MARGIN_MM = 4;
const PDF_CANVAS_SCALE = 2;
const PDF_JPEG_QUALITY = 0.92;
const PDF_DEFAULT_FILENAME = "GST-Invoice";

/** @param {number} n */
function formatMoney(n) {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}
const newItemDefaults = {
  product: "",
  pack: "",
  hsn: "",
  mrp: "",
  qty: "",
  unit: "",
  free: 0,
  rate: 0,
  gst: 0
};

function num(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createRow(data = {}) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector("tr");

  row.querySelector(".product").value = data.product || "";
  row.querySelector(".pack").value = data.pack ?? 12;
  row.querySelector(".hsn").value = data.hsn ?? "";
  row.querySelector(".mrp").value = data.mrp ?? 20;
  row.querySelector(".qty").value = data.qty ?? 3;
  row.querySelector(".unit").value = data.unit ?? "";
  row.querySelector(".free").value = data.free ?? 0;
  row.querySelector(".rate").value = data.rate ?? 1491.6;
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
  const gst = num(row.querySelector(".gst").value);

  const gross = qty * rate;
  const taxable = gross;
  const gstAmt = (taxable * gst) / 100;
  /* Intra-state: SGST + CGST = headline GST%, each half (e.g. 5% → 2.5% + 2.5%) */
  const half = gst / 2;
  const sgstAmt = (taxable * half) / 100;
  const cgstAmt = (taxable * half) / 100;
  const amount = taxable + gstAmt;

  row.querySelector(".taxableCell").textContent = formatMoney(taxable);
  row.querySelector(".gstAmtCell").textContent = formatMoney(gstAmt);
  row.querySelector(".amountCell").textContent = formatMoney(amount);

  return { taxable, gstAmt, sgstAmt, cgstAmt, amount };
}

function recalculateAll() {
  const rows = [...itemsBody.querySelectorAll("tr")];
  let taxableTotal = 0;
  let sgstTotal = 0;
  let cgstTotal = 0;

  rows.forEach((row, idx) => {
    row.querySelector(".rowNo").textContent = idx + 1;
    const values = recalculateRow(row);
    taxableTotal += values.taxable;
    sgstTotal += values.sgstAmt;
    cgstTotal += values.cgstAmt;
  });

  const preRound = taxableTotal + sgstTotal + cgstTotal;
  const grandRounded = Math.round(preRound);
  const roundOff = grandRounded - preRound;

  subTotalEl.textContent = formatMoney(taxableTotal);
  sgstTotalEl.textContent = formatMoney(sgstTotal);
  cgstTotalEl.textContent = formatMoney(cgstTotal);
  roundOffEl.textContent = formatMoney(roundOff);
  grandTotalEl.textContent = formatMoney(grandRounded);
}

addRowBtn.addEventListener("click", () => createRow(newItemDefaults));
function addScaledImageToSinglePdfPage(pdf, imgData, marginMm) {
  const pageInnerW = pdf.internal.pageSize.getWidth() - 2 * marginMm;
  const pageInnerH = pdf.internal.pageSize.getHeight() - 2 * marginMm;
  const props = pdf.getImageProperties(imgData);
  const iw = props.width;
  const ih = props.height;
  const imgAspect = iw / ih;
  const boxAspect = pageInnerW / pageInnerH;
  let finalW;
  let finalH;
  if (imgAspect > boxAspect) {
    finalW = pageInnerW;
    finalH = pageInnerW / imgAspect;
  } else {
    finalH = pageInnerH;
    finalW = pageInnerH * imgAspect;
  }
  const x = marginMm + (pageInnerW - finalW) / 2;
  const y = marginMm + (pageInnerH - finalH) / 2;
  pdf.addImage(imgData, "JPEG", x, y, finalW, finalH);
}

function restorePdfUiState(hideElements, pageElement, tableWrap, prevPageMaxWidth, prevTableOverflow, prevTableOverflowX) {
  hideElements.forEach((element) => {
    element.style.display = element.dataset.prevDisplay || "";
    delete element.dataset.prevDisplay;
  });
  document.body.classList.remove("pdf-export");
  pageElement.style.maxWidth = prevPageMaxWidth;
  if (tableWrap) {
    tableWrap.style.overflow = prevTableOverflow;
    tableWrap.style.overflowX = prevTableOverflowX;
  }
}

downloadPdfBtn.addEventListener("click", async () => {
  const JsPDF = window.jspdf?.jsPDF || window.jspdf?.default;
  if (typeof html2canvas === "undefined" || typeof JsPDF !== "function") {
    alert("PDF libraries are not loaded. Please check internet and reload the page.");
    return;
  }

  const invoiceNo = document.getElementById("invoiceNo").value.trim() || "invoice";
  const fileName = `${PDF_DEFAULT_FILENAME}-${invoiceNo}.pdf`;
  const pageElement = document.querySelector(".page");
  const hideElements = document.querySelectorAll(".no-print");
  const tableWrap = document.querySelector(".table-wrap");

  const pdfLabelDefault = downloadPdfBtn.textContent;
  downloadPdfBtn.disabled = true;
  downloadPdfBtn.setAttribute("aria-busy", "true");
  downloadPdfBtn.textContent = "Generating…";

  hideElements.forEach((element) => {
    element.dataset.prevDisplay = element.style.display;
    element.style.display = "none";
  });
  document.body.classList.add("pdf-export");

  const prevPageMaxWidth = pageElement.style.maxWidth;
  const prevTableOverflow = tableWrap ? tableWrap.style.overflow : "";
  const prevTableOverflowX = tableWrap ? tableWrap.style.overflowX : "";
  pageElement.style.maxWidth = "none";
  if (tableWrap) {
    tableWrap.style.overflow = "visible";
    tableWrap.style.overflowX = "visible";
  }

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(pageElement, {
      scale: PDF_CANVAS_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: pageElement.scrollWidth,
      windowHeight: pageElement.scrollHeight
    });

    const imgData = canvas.toDataURL("image/jpeg", PDF_JPEG_QUALITY);
    const pdf = new JsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    });

    addScaledImageToSinglePdfPage(pdf, imgData, PDF_MARGIN_MM);
    pdf.save(fileName);
  } catch (err) {
    console.error(err);
    alert("Could not create PDF. Try again or use fewer rows.");
  } finally {
    restorePdfUiState(hideElements, pageElement, tableWrap, prevPageMaxWidth, prevTableOverflow, prevTableOverflowX);
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.setAttribute("aria-busy", "false");
    downloadPdfBtn.textContent = pdfLabelDefault;
  }
});

const today = new Date().toISOString().split("T")[0];
document.getElementById("invoiceDate").value = today;

createRow({
  product: "Sample Item",
  pack: 120,
  hsn: "210690",
  mrp: 20,
  qty: 3,
  unit: "BOX",
  free: 0,
  rate: 1491.6,
  gst: 5
});
