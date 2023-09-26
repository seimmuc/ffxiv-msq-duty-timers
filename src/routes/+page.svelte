<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faPause, faPlay, faRotateLeft, faVolumeOff, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";

  import HScrollContainer from "$lib/HScrollContainer.svelte";
  import { Cutscene, Fight, Stage, duties, formatTime } from "$lib/duties";

  import soundPingQuiet from "$lib/assets/sounds/stop-13692.mp3";
  import soundPingLoud from "$lib/assets/sounds/notification-sound-7062.mp3";
  // import soundPingLoud2 from "$static/assets/sounds/soft-alert-81627.mp3";

  let stageSelectionWidth: number = 0;

  let curDutyId: keyof typeof duties | undefined = undefined;
  let curStageIndex: number = 0;
  let timeLeft: number = 0;
  let timeIntervalStartedLeft: number = 0;
  let timeIntervalStartedDate: Date | undefined = undefined;
  let timeIntervalId: number | undefined = undefined;
  let audio = {src: "", muted: true, paused: true, currentTime: 0, volume: 1};
  const audioSteps = [{t: 10, s: soundPingQuiet}, {t: 5, s: soundPingQuiet}, {t: 0, s: soundPingLoud}];
  let curAudioStep = 0;

  function setDuty(key: string) {
    if (!duties.hasOwnProperty(key)) { return; }  // can't use 'keyof typeof duties' as param type because svelte doesn't support TS in HTML
    curDutyId = key as keyof typeof duties;
    setStage(0);
  }
  function setStage(stageIndex: number) {
    if (curDutyId === undefined) { return; }
    curStageIndex = stageIndex;
    const duty = duties[curDutyId];
    if (stageIndex < 0 || stageIndex >= duty.stages.length) { return; }
    const stage = duty.stages[stageIndex];
    stopTimer();
    if (stage instanceof Cutscene) {
      timeLeft = stage.duration;
    }
  }

  function updateTime() {
    if (timeIntervalStartedDate === undefined) { return; }
    timeLeft = timeIntervalStartedLeft - ((new Date().getTime() - timeIntervalStartedDate.getTime()) / 1000);
    if (timeLeft <= 0) {
      timeLeft = 0;
      timeIntervalStartedDate = undefined;  // prevent updateTime() from running again
      stopTimer();
    }
    if (timeLeft <= audioSteps[curAudioStep]?.t) {
      if (!audio.muted) {
        audio = {...audio, src: audioSteps[curAudioStep].s, currentTime: 0, paused: false};
      }
      curAudioStep++;
    }
  }

  function startTimer(_: boolean = false) {
    if (timeIntervalId !== undefined) { return; }
    if (timeLeft <= 0) { return; }
    timeIntervalStartedDate = new Date();
    timeIntervalStartedLeft = timeLeft;
    timeIntervalId = setInterval(updateTime, 40);
    curAudioStep = audioSteps.findIndex((as) => as.t < timeLeft);
  }
  function stopTimer(click: boolean = false) {
    if (timeIntervalId === undefined) { return; }
    clearInterval(timeIntervalId);
    updateTime();
    timeIntervalStartedDate = undefined;
    timeIntervalStartedLeft = 0;
    timeIntervalId = undefined;
    if (click) {
      audio = {...audio, src: "", paused: true, currentTime: 0};
    }
  }
  const togglePause = () => (timeIntervalId === undefined ? startTimer : stopTimer)(true);
  function resetTimer() {
    stopTimer();
    timeLeft = currentStage instanceof Cutscene ? currentStage.duration : 0;
  }
  function adjustTime(amount: number) {
    if (timeIntervalStartedDate === undefined) {
      timeLeft += amount;
    } else {
      timeIntervalStartedDate = new Date(timeIntervalStartedDate.getTime() + amount * 1000);
    }
  }
  
  $: currentDuty = curDutyId === undefined? undefined : duties[curDutyId];
  $: currentStage = currentDuty === undefined? undefined : currentDuty.stages[curStageIndex];
  $: timeLeftFormatted = formatTime(timeLeft, true);
</script>

<main>
  <ul class="duty-list">
    {#each Object.entries(duties) as [key, duty]}
      <li class:current={key === curDutyId}>
        <button on:click={() => setDuty(key)}>{duty.name}</button>
      </li>
    {/each}
  </ul>

  {#if currentDuty}
    <div class="stage-selection" bind:clientWidth={stageSelectionWidth}>
      <HScrollContainer maxWidth={stageSelectionWidth || undefined} mode={2}
          bgl="linear-gradient(to left, transparent, var(--page-bg) 80%)" bgr="linear-gradient(to right, transparent, var(--page-bg) 80%)" fg="var(--page-fg)"
      >
        {#each currentDuty.stages as stage, i}
          <button
              class="stage-btn" class:current={i === curStageIndex} style:--sc={stage.getColor()}
              on:click={() => setStage(i)}
          >
            <p class="stage-title">{stage.getTitle()}</p>
            <p class="stage-subtitle">{#if stage.getSubtitle()}{stage.getSubtitle()}{:else}&nbsp;{/if}</p>
          </button>
        {/each}
      </HScrollContainer>
    </div>
  {/if}

  <div class="timer-box">
    {#if currentDuty === undefined}
      <p class="message">No duty is selected</p>
    {:else if currentStage === undefined}
      <p class="message">No stage is selected</p>
    {:else if currentStage instanceof Fight}
      <p class="message">Good luck Warrior of Light!</p>
    {:else}
      <p class="timer-clock" style:color={timeLeft < 10 ? 'red' : 'var(--page-fg)'}>{timeLeftFormatted}</p>
      <div class="controls" style:--sc={currentStage.getColor()}>
        <button class="time-adjust l" on:click={() => adjustTime(-5)}>-5s</button>
        <button class="time-adjust r" on:click={() => adjustTime(+5)}>+5s</button>
        <button class="pause" on:click={togglePause} aria-label="{timeIntervalId === undefined? 'start' : 'pause'}">
          {#if timeIntervalId === undefined}
            <FontAwesomeIcon icon={faPlay} />
          {:else}
            <FontAwesomeIcon icon={faPause} />
          {/if}
        </button>
        <button aria-label="reset" on:click={resetTimer}>
          <FontAwesomeIcon icon={faRotateLeft} />
        </button>
        <button on:click={() => audio = {...audio, muted: !audio.muted}}>
          {#if audio.muted}
            <FontAwesomeIcon icon={faVolumeOff} />
          {:else}
            <FontAwesomeIcon icon={faVolumeHigh} />
          {/if}
        </button>
        <audio
            src={audio.src}
            bind:muted={audio.muted}
            bind:paused={audio.paused}
            bind:currentTime={audio.currentTime}
            bind:volume={audio.volume}
        />
      </div>
    {/if}
  </div>
  
</main>


<style lang="scss">
  @use 'sass:math';

  @function main_outline_color($mix_percent) {
    @return color-mix(in srgb, gray #{$mix_percent}, var(--page-bg));
  }
  @function stage_button_background_duo($mix_percent, $selected) {
    @return linear-gradient(to top, color-mix(in srgb, var(--sc) #{$mix_percent}, var(--page-bg)) 0% 80%, color-mix(in srgb, var(--sc) #{$mix_percent * if($selected, 0.75, 0.5)}, var(--page-bg)) 80%);
  }
  @function stage_button_background($mix_percent) {
    @return color-mix(in srgb, var(--sc) #{$mix_percent}, var(--page-bg));
  }
  @function stage_button_foreground($mix_percent) {
    @return color-mix(in xyz, var(--sc) #{$mix_percent}, var(--page-fg));
  }

  main {
    border: 1px solid main_outline_color(50%);
    border-radius: 10px;
    overflow: hidden;
    margin: 2em 3.5vh;
    font-family: Arial, Helvetica, sans-serif;
  }

  ul.duty-list {
    $button-vpadding: 10px;
    $select-border: 2px;
    user-select: none;
    list-style: none;
    margin: 0;
    padding: 0;
    border-bottom: 1px solid main_outline_color(40%);
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-evenly;
    align-items: stretch;
    > li {
      flex-grow: 1;
      > button {
        color: color-mix(in srgb, gray, var(--page-fg) 65%);
        background-color: transparent;
        padding: $button-vpadding 0;
        border: none;
        height: 100%; // calc(100% + 1px); to merge button's border with ul's
        width: 100%;
        font-family: inherit;
        cursor: pointer;
        &:hover {
          color: var(--page-fg);
        }
      }
      &.current > button {
        border-bottom: $select-border solid color-mix(in xyz, blue, var(--page-fg) 30%);
        padding-bottom: $button-vpadding - $select-border;
      }
    }
  }

  div.stage-selection {
    padding: 5px 0;
    border-bottom: 1px solid main_outline_color(40%);
    display: flex;
    flex-direction: row;
    justify-content: center;

    button.stage-btn {
      border: none;
      margin: 0 2.5px;
      padding: 3px 0;
      padding-top: calc(3px + 7.5%);
      background: stage_button_background_duo(30%, false);
      user-select: none;
      font-family: inherit;
      cursor: pointer;
      p {
        margin: 1px 10px;
      }
      p.stage-title {
        color: stage_button_foreground(35%);
        font-size: 20px;
      }
      p.stage-subtitle {
        color: stage_button_foreground(70%);
        font-size: 12px;
      }
      &:hover {
        background: stage_button_background_duo(22%, false);
        & p.stage-title {
          color: stage_button_foreground(50%);
        }
        & p.stage-subtitle {
          color: stage_button_foreground(80%);
        }
      }
      &:active {
        background: stage_button_background_duo(15%, false);
        & p.stage-title {
          color: stage_button_foreground(65%);
        }
        & p.stage-subtitle {
          color: stage_button_foreground(85%);
        }
      }
      &.current {
        padding-bottom: 1px;
        border-bottom: 2px solid color-mix(in srgb, var(--sc), var(--page-fg) 25%);
        box-shadow: inset 0 0 8px 4px color-mix(in srgb, var(--page-fg) 15%, transparent);
        background: stage_button_background_duo(50%, true);
      }
    }
  }

  div.timer-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 25px 15px;
    p.message {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 3em;
      margin: 20px 0;
    }
    p.timer-clock {
      font-family: Roboto, Oxygen, Ubuntu, 'Segoe UI', 'Open Sans', Cantarell, 'Helvetica Neue', sans-serif;
      font-size: 5em;
      margin: 30px 0 20px;
    }
    div.controls {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      button {
        width: 60px;
        height: 40px;
        border: none;
        border-radius: 40px;
        background-color: stage_button_background(60%);
        color: stage_button_foreground(5%);
        font-size: 20px;
        margin: 0 5px;
        padding: 0 6px;
        cursor: pointer;
        &:hover {
          background-color: stage_button_background(50%);
          color: stage_button_foreground(15%);
        }
        &:active {
          background-color: stage_button_background(45%);
          color: stage_button_foreground(25%);
        }
        &.l {
          border-radius: 40px 0 0 40px;
          margin-right: 0px;
          padding-right: 0;
          width: 54px;
        }
        &.r {
          border-radius: 0 40px 40px 0;
          margin-left: 0px;
          padding-left: 0;
          width: 54px;
        }
      }
    }
  }
</style>