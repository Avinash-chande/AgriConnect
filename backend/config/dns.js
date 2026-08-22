import dns from 'node:dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);

console.log('✅ DNS configured: Google + Cloudflare');