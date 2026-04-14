const QRCode = require("qrcode");

function gerarPixCopiaECola({ chave, nome, cidade, valor, txid, mensagem }) {
  function fmt(id, val) {
    const len = String(val.length).padStart(2, "0");
    return `${id}${len}${val}`;
  }

  const pixKey = fmt("01", chave);
  const infos = mensagem ? fmt("02", mensagem.substring(0, 72)) : "";
  const merchant = fmt("26", fmt("00", "BR.GOV.BCB.PIX") + pixKey + infos);

  const tid = (txid || "***").substring(0, 25).replace(/[^A-Za-z0-9]/g, "");
  const ref = fmt("62", fmt("05", tid || "***"));

  const nomeFormatado = nome.substring(0, 25).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const cidadeFormatada = cidade.substring(0, 15).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  let payload =
    fmt("00", "01") +
    fmt("01", "12") +
    merchant +
    fmt("52", "0000") +
    fmt("53", "986") +
    (valor ? fmt("54", parseFloat(valor).toFixed(2)) : "") +
    fmt("58", "BR") +
    fmt("59", nomeFormatado) +
    fmt("60", cidadeFormatada) +
    ref +
    "6304";

  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return payload + (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

module.exports = async (req, res) => {
  const { chave, nome, cidade, valor, saida, txid, mensagem, tamanho } = req.query;

  if (!chave || !nome || !cidade) {
    return res.status(400).json({ erro: "Parâmetros obrigatórios: chave, nome, cidade" });
  }

  const brcode = gerarPixCopiaECola({ chave, nome, cidade, valor, txid, mensagem });

  if (saida === "br") {
    return res.status(200).send(brcode);
  }

  const size = parseInt(tamanho) || 300;
  const qrBuffer = await QRCode.toBuffer(brcode, { width: size });

  res.setHeader("Content-Type", "image/png");
  return res.send(qrBuffer);
};
