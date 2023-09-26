<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

  export let maxWidth: number | undefined = 50;
  export let scrollSpeed = 3;
  export let scrollStepDelay = 25;
  export let mode = 1;
  export let bgl: string | undefined = undefined;
  export let bgr: string | undefined = undefined;
  export let fg: string | undefined = undefined;

  let leftArrElem: HTMLButtonElement | undefined = undefined;
  let contentWidth = 0;
  let scrollPx = 0;
  let leftArrow = false;
  let rightArrow = false;

  let scrollIntervalId: number | undefined = undefined;

  function scroll(mult: number) {
    scrollPx += scrollSpeed * mult;
    if (scrollPx < 0) { scrollPx = 0; }
    else if (scrollPx > maxScroll) { scrollPx = maxScroll; }
  }
  function startScrolling(dir: number) {
    stopScrolling();
    scrollIntervalId = setInterval(scroll, scrollStepDelay, dir);
    scroll(dir);
  }
  function stopScrolling() {
    if (scrollIntervalId !== undefined) {
      clearInterval(scrollIntervalId);
      scrollIntervalId = undefined;
    }
  }
  const mdown = (dir: number) => () => startScrolling(dir);
  const mup = stopScrolling;

  function updateArrowVisibility(left: boolean, right: boolean) {
    if ((leftArrow && !left) || (rightArrow && !right)) {
      stopScrolling();
    }
    leftArrow = left;
    rightArrow = right;
  }

  $: maxScroll = maxWidth === undefined ? 0 : contentWidth - maxWidth;
  $: scrollM1 = scrollPx + ((leftArrow && leftArrElem)? leftArrElem?.clientWidth + 2 : 0);
  $: {
    if (maxScroll > 0) {
      updateArrowVisibility(scrollPx > 0, scrollPx < maxScroll);
    } else {
      scrollPx = 0;
      updateArrowVisibility(false, false);
    }
  }
</script>

<div class="container" class:m2={mode == 2} style:max-width={maxWidth === undefined ? undefined : `${maxWidth}px`}>
  {#if leftArrow}
    <button
        class="arrow-btn l" class:m2={mode == 2}
        on:mousedown={mdown(-1)} on:mouseup={mup} on:mouseleave={mup}
        style:background={bgl} style:color={fg}
        bind:this={leftArrElem}
    >
      <FontAwesomeIcon icon={faChevronLeft} />
    </button>
  {/if}
  <div class="view" class:m2={mode == 2}>
    <div class="content" bind:clientWidth={contentWidth} style:left={`${mode == 2 ? -scrollPx : -scrollM1}px`}>
      <slot />
    </div>
  </div>
  {#if rightArrow}
    <button
        class="arrow-btn r" class:m2={mode == 2}
        on:mousedown={mdown(1)} on:mouseup={mup} on:mouseleave={mup}
        style:background={bgr} style:color={fg}
    >
      <FontAwesomeIcon icon={faChevronRight} />
    </button>
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    &.m2 {
      position: relative;
    }
  }
  .arrow-btn {
    flex-shrink: 0;
    min-width: fit-content;
    border: none;
    padding: 0;
    background-color: transparent;
    &.m2 {
      position: absolute;
      height: 100%;
      z-index: 1;
      &.r {
        right: 0;
      }
      &.l {
        left: 0;
      }
    }
  }
  .view {
    overflow: hidden;
    &.m2 {
      z-index: 0;
    }
  }
  .content {
    flex-shrink: 1;
    position: relative;
    left: -20px;
    width: max-content;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    text-wrap: nowrap;
  }
</style>