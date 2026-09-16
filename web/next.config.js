/** @type {import('next').NextConfig} */
const nextConfig = {
  // ssh2 usa require() dinamico e um addon nativo opcional para crypto;
  // precisa ser carregado diretamente pelo Node em runtime, nao empacotado
  // pelo bundler (Turbopack falha ao tentar empacotar node_modules/ssh2/lib/protocol/crypto.js).
  serverExternalPackages: ["ssh2"],
};

module.exports = nextConfig;
