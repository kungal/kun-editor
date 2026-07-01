// Built-in emoji set for the picker's 表情 / emoji tab. Emoji are plain unicode
// text (no adapter, no server), so they ship with the editor. This is a curated
// common set — smaller than the forum's ~1270-entry list to keep the package
// lean, while covering the everyday faces / gestures / hearts / symbols people
// actually reach for. Inserted as text at the cursor.
export const EMOJI: readonly string[] = [
  // Smileys
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
  '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋',
  '😛', '😜', '🤪', '😝', '🤗', '🤭', '🤔', '🤐', '😐', '😑',
  '😶', '😏', '😒', '🙄', '😬', '😌', '😔', '😪', '🤤', '😴',
  '😷', '🤒', '🤕', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳',
  '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳',
  '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
  '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬',
  '😈', '👿', '💀', '💩', '🤡', '👻', '👽', '🤖', '😺', '😸',
  // Gestures / people
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '👋',
  '🤚', '🖐️', '✋', '👏', '🙌', '🤝', '🙏', '💪', '👀', '👁️',
  // Hearts / symbols
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
  '💞', '💓', '💗', '💖', '💘', '💝', '💯', '✨', '⭐', '🌟',
  '🔥', '💥', '💫', '⚡', '☀️', '🌈', '🎉', '🎊', '🎁', '🏆',
  // Animals / food / misc
  '🐶', '🐱', '🐭', '🦊', '🐻', '🐼', '🐨', '🦄', '🐢', '🐳',
  '🍎', '🍑', '🍓', '🍉', '🍰', '🍺', '🍵', '☕', '🍜', '🍙',
  '✅', '❌', '❓', '❗', '💤', '👑', '🎮', '🎵', '📌', '🔖'
]
