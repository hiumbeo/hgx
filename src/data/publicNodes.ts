import { LavalinkNode } from '../types';

export const DEFAULT_PUBLIC_NODES: LavalinkNode[] = [
  {
    name: 'Aegis Public Node 1 (US-East)',
    host: 'lava-v4.ajieblogs.eu.org',
    port: 443,
    password: 'https://dsc.gg/ajidevserver',
    secure: true,
    status: 'connected',
    ping: 28,
    region: 'US-East',
    memoryUsage: '412 MB / 2048 MB',
    activePlayers: 14
  },
  {
    name: 'Aegis Public Node 2 (EU-Central)',
    host: 'lavalink.serenetia.com',
    port: 443,
    password: 'youshallnotpass',
    secure: true,
    status: 'connected',
    ping: 42,
    region: 'EU-Central',
    memoryUsage: '654 MB / 4096 MB',
    activePlayers: 29
  },
  {
    name: 'Aegis Public Node 3 (Asia-SG)',
    host: 'node1.inrl.in',
    port: 443,
    password: 'inrl',
    secure: true,
    status: 'connected',
    ping: 18,
    region: 'Asia-Singapore',
    memoryUsage: '320 MB / 2048 MB',
    activePlayers: 8
  },
  {
    name: 'Aegis Standby Node (Backup)',
    host: 'lavalink-v4.darrennathanael.com',
    port: 443,
    password: 'darrennathanael.com',
    secure: true,
    status: 'connected',
    ping: 55,
    region: 'Global CDN',
    memoryUsage: '580 MB / 4096 MB',
    activePlayers: 45
  }
];
