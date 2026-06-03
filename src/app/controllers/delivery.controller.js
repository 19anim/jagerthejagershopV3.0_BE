const STORE_ADDRESS =
  "304/50/16 Đường Nguyễn Thượng Hiền, Phường 05, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam";

const deliveryController = {
  estimate: async (req, res) => {
    const { receipentName, phoneNumber, address, ward, district, city } = req.body;

    if (!receipentName || !phoneNumber || !address || !ward || !district) {
      return res.status(400).json({ errorMessage: "Vui lòng nhập đầy đủ địa chỉ giao hàng." });
    }

    if (!process.env.AHAMOVE_API_URL || !process.env.AHAMOVE_ACCESS_TOKEN) {
      return res.status(503).json({ errorMessage: "Dịch vụ giao hàng chưa được cấu hình." });
    }

    const destination = `${address}, ${ward}, ${district}, ${city || "Hồ Chí Minh"}, Việt Nam`;
    const payload = {
      method_id: "GPQB",
      method_type: "cash",
      remarks: "",
      payment_method: "CASH_BY_RECIPIENT",
      order_time: 0,
      path: [
        {
          lat: 10.805882,
          lng: 106.684421,
          address: STORE_ADDRESS,
          short_address: STORE_ADDRESS,
          types: ["Feature"],
          name: "JagerTheJager",
          mobile: "0927183879",
          adr_source: "pelias",
        },
        {
          address: destination,
          short_address: destination,
          types: ["Feature"],
          name: receipentName,
          mobile: phoneNumber,
          cod: 0,
          adr_source: "pelias",
          item_description: "Khác",
          item_descriptions: [{ code: "other", keyword: "Khác", group: "other" }],
          item_value: 0,
        },
      ],
      images: [],
      package_detail: [],
      services: [{ _id: "SGN-BIKE", requests: [{ _id: "SGN-BIKE-INSURANCE" }] }],
      token: process.env.AHAMOVE_ACCESS_TOKEN,
    };

    try {
      const response = await fetch(process.env.AHAMOVE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data?.[0]?.total_pay) {
        return res.status(502).json({ errorMessage: "Không thể tính phí giao hàng." });
      }

      return res.status(200).json({ deliveryPrice: data[0].total_pay });
    } catch (error) {
      return res.status(502).json({ errorMessage: "Không thể kết nối dịch vụ giao hàng." });
    }
  },
};

module.exports = deliveryController;
