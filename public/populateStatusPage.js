// This script will populate the Status Page localStorage with the provided data.
(function() {
  const data = [
    {
      slNo: "1",
      product: "Power Relay 18VDC",
      invoiceDate: "VES/23-24/1001",
      paymentReceivedFromClient: "TRUE",
      client: "Meltronics",
      qty: "40",
      bankTransferredAmountUSD: "",
      totalBankTransferAmountINR: "",
      courier: "",
      customs: "",
      miscCharges: "",
      emdCharges: "",
      epbgCharges: "",
      totalLandingCost: "₹15,766.00",
      totalLandingCostPerPc: "₹394.15",
      igstFromCustoms: "",
      totalInvoiceAmountWithoutGST: "₹40,650.0",
      sellingPrice: "₹1,016.3",
      gstCollectedFromClient: "",
      gstPaidToVendor: "",
      differenceInGSTAmount: "₹622.10",
      profitPerPc: "₹24,884.00",
      profitTotal: "61%",
      profitPercent: "IDBI",
      paymentRecvdBank: "TRUE",
      paymentMadeToVendor: "TRUE",
      shipmentArrangedFromVendor: "TRUE",
      customsCleared: "TRUE",
      regularizationGovtRegistration: "TRUE",
      productsReceived: "TRUE",
      deliveryChallanInvoicePrepared: "TRUE",
      shipmentDeliveredToClient: "TRUE",
      pickUpNo: "",
      boeNo: "",
      awb: ""
    },
    // ... Add more objects for each row as needed ...
  ];
  localStorage.setItem("statuspage", JSON.stringify(data));
})();
