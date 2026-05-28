import { RefObject } from 'react';

let scrollRoot: RefObject<HTMLDivElement | null> | null = null;

export function setScrollRoot(ref: RefObject<HTMLDivElement | null>) {
  scrollRoot = ref;
}

export function getScrollRoot() {
  return scrollRoot;
}
