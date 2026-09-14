// Deliberately no catch-all: news/detail must retain this slot during soft
// navigation. Top-level tabs and utility pages explicitly render null.
export default function EmptyMessagesSlot() {
  return null;
}
