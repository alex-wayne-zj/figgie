import type { Player } from '../types/player';
import playerAvatar from '../assets/player.svg'

export const defaultRoomName = 'Alex的房间'

export const defaultRoomID = 'R123-456-ABCD';

export const currentPlayer: Player = {
  id: 'player_001',
  name: 'Alex',
  avatar: playerAvatar,
};