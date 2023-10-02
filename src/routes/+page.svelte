<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faPause, faPlay, faRotateLeft, faVolumeOff, faVolumeHigh, faBars } from "@fortawesome/free-solid-svg-icons";
  import { faGithub } from "@fortawesome/free-brands-svg-icons";

  import HScrollContainer from "$lib/HScrollContainer.svelte";
  import { Cutscene, Fight, Interaction, Stage, duties, formatTime } from "$lib/duties";

  import soundPingQuiet from "$lib/assets/sounds/stop-13692.mp3";
  import soundPingLoud from "$lib/assets/sounds/notification-sound-7062.mp3";
	import { onMount } from "svelte";
  // import soundPingLoud2 from "$static/assets/sounds/soft-alert-81627.mp3";

  // TODO?: settings to pick different sounds and change sound timing
  // const notypecheck = (x:any)=>x;   // hacky ts fix: https://github.com/sveltejs/language-tools/issues/1026#issuecomment-1002839154

  const githubUrl = 'https://github.com/seimmuc/ffxiv-msq-duty-timers';

  let stageSelectionWidth: number = 0;
  let menuRoot: HTMLLIElement | undefined = undefined;

  let curDutyId: keyof typeof duties | undefined = undefined;
  let curStageIndex: number = 0;
  let filteredStages: Array<[Stage, number]> | undefined = [];
  let timeLeft: number = 0;
  let timeIntervalStartedLeft: number = 0;
  let timeIntervalStartedDate: Date | undefined = undefined;
  let timeIntervalId: number | undefined = undefined;
  let audio = {src: "", muted: true, paused: true, currentTime: 0, volume: 100, pVolume: 100};
  const audioSteps = [{t: 10, s: soundPingQuiet}, {t: 5, s: soundPingQuiet}, {t: 0, s: soundPingLoud}];
  let curAudioStep = 0;
  let menuPopupShown = false;
  let onlyCutscenes = false;
  let mergeCutscenes = false;

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
    resetAudioStep();
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
  const resetAudioStep = () => { curAudioStep = audioSteps.findIndex((as) => as.t < timeLeft); };
  function resetTimer() {
    stopTimer();
    timeLeft = currentStage instanceof Cutscene ? currentStage.duration : 0;
  }
  function adjustTime(amount: number) {
    timeLeft += amount;
    resetAudioStep();
    if (timeIntervalStartedDate !== undefined) {
      timeIntervalStartedDate = new Date(timeIntervalStartedDate.getTime() + amount * 1000);
    }
  }

  function toggleMute() {
    if (audio.muted) {
      audio = {...audio, muted: false, volume: audio.pVolume};
    } else {
      audio = {...audio, muted: true, volume: 0, pVolume: audio.volume};
    }
    lsSet('muted', audio.muted.toString());
  }
  function onVolumeChange() {
    audio = {...audio, muted: false};
    lsSet('volume', audio.volume.toString());
    lsSet('muted', 'false');
  }
  function onStageFiltersUpdate() {
    lsSet('onlyCutscenes', onlyCutscenes.toString());
    lsSet('mergeCutscenes', mergeCutscenes.toString());
  }

  function onClickAnywhere(e: MouseEvent) {
    if (menuPopupShown && menuRoot !== undefined && e.target instanceof Node && !menuRoot.contains(e.target)) {
      menuPopupShown = false;
    }
  }

  function lsIfExists(key: string, func: (value: string) => void) {
    let val = null;
    try {
      val = window.localStorage.getItem(key);
    } catch (_) {}
    if (val !== null) {
      func(val);
    }
  }
  function lsSet(key: string, val: string) {
    try {
      window.localStorage.setItem(key, val);
    } catch (_) {}
  }
  onMount(() => {
    lsIfExists('muted', m => audio.muted = m !== 'false');
    lsIfExists('volume', v => audio.volume = parseFloat(v));
    lsIfExists('onlyCutscenes', oc => onlyCutscenes = oc === 'true');
    lsIfExists('mergeCutscenes', mc => mergeCutscenes = mc === 'true');
    if (audio.muted) {
      audio = {...audio, volume: 0, pVolume: audio.volume};
    }
  });

  $: currentDuty = curDutyId === undefined? undefined : duties[curDutyId];
  $: currentStage = currentDuty === undefined? undefined : currentDuty.stages[curStageIndex];
  $: timeLeftFormatted = formatTime(timeLeft, true);
  $: audioVol = Math.max(Math.min(audio.volume / 100, 1), 0);
  $: {
    if (currentDuty === undefined) {
      filteredStages = undefined;
    } else {
      let stages: Stage[] = currentDuty.stages;
      if (mergeCutscenes) {
        stages = currentDuty.stages.reduce((res, s) => {
          if (s instanceof Interaction) { return res; }
          if (s instanceof Cutscene && (res.length > 1 && res[res.length - 1] instanceof Cutscene)) {
            const oldCs: Cutscene = res[res.length - 1] as Cutscene;
            res[res.length - 1] = new Cutscene(oldCs.name, oldCs.duration + s.duration, oldCs.color);
            return res;
          }
          res.push(s);
          return res;
        }, [] as Stage[]);
      }
      filteredStages = stages.map((s, i) => (!onlyCutscenes || s instanceof Cutscene)? [s, i] : undefined).filter(a => a != undefined) as Array<[Stage, number]> | undefined;
    }
  }
</script>

<svelte:window on:click={onClickAnywhere} />

<main>
  <ul class="duty-list">
    {#each Object.entries(duties) as [key, duty]}
      <li class:current={key === curDutyId}>
        <button on:click={() => setDuty(key)}>{duty.name}</button>
      </li>
    {/each}
    <li bind:this={menuRoot} class="no-grow">
      <button class="menu-btn" on:click={() => menuPopupShown = !menuPopupShown}><FontAwesomeIcon icon={faBars} /></button>
      <div class="menu-popup" style:display={menuPopupShown? 'block' : 'none'}>
        <ul>
          <li><label><input type="checkbox" bind:checked={onlyCutscenes} on:change={onStageFiltersUpdate}><span class="setting-label">Only cutscenes</span></label></li>
          <li><label><input type="checkbox" bind:checked={mergeCutscenes} on:change={onStageFiltersUpdate}><span class="setting-label">Merge adjacent cutscenes<br>(also removes interactions)</span></label></li>
          <li><a href={githubUrl} class="menu-link"><FontAwesomeIcon icon={faGithub} /><span>Github repo</span></a></li>
        </ul>
      </div>
    </li>
  </ul>

  {#if currentDuty && filteredStages !== undefined}
    <div class="stage-selection" bind:clientWidth={stageSelectionWidth}>
      <HScrollContainer maxWidth={stageSelectionWidth || undefined} mode={2} scrollSpeed={10}
          bgl="linear-gradient(to left, transparent, var(--page-bg) 80%)" bgr="linear-gradient(to right, transparent, var(--page-bg) 80%)" fg="var(--page-fg)"
      >
        {#each filteredStages as [stage, i]}
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
    {:else if currentStage instanceof Interaction}
      <p class="message">{currentStage.getSubtitle()}</p>
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
        <div class="vol">
          <button class="btn-mute" on:click={toggleMute}>
            {#if audio.muted || audio.volume <= 0}
              <FontAwesomeIcon icon={faVolumeOff} />
            {:else}
              <FontAwesomeIcon icon={faVolumeHigh} />
            {/if}
          </button>
          <div class="volume-slider-popup">
            <input type="range" bind:value={audio.volume} on:input={onVolumeChange} min=0 max=100 />
            <span>{audio.volume}</span>
          </div>
        </div>
        <audio
            src={audio.src}
            bind:muted={audio.muted}
            bind:paused={audio.paused}
            bind:currentTime={audio.currentTime}
            bind:volume={audioVol}
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

  $main-bradius: 10px;

  main {
    border: 1px solid main_outline_color(50%);
    border-radius: $main-bradius;
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
      &.no-grow {
        flex-grow: 0;
        position: relative;
      }
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
        &.menu-btn {
          padding: $button-vpadding;
          background-color: main_outline_color(40%);
        }
      }
      &.current > button {
        border-bottom: $select-border solid color-mix(in xyz, blue, var(--page-fg) 30%);
        padding-bottom: $button-vpadding - $select-border;
      }
      &:first-of-type > button {
        border-top-left-radius: $main-bradius - 1px;
      }
      &:last-of-type > button {
        border-top-right-radius: $main-bradius - 1px;
      }
    }
  }

  div.menu-popup {
    position: absolute;
    right: 0;
    display: none;
    background-color: main_outline_color(2.5%);
    border: 1px solid main_outline_color(20%);
    z-index: 10;
    ul {
      list-style: none;
      padding: 4px;
      display: grid;
      row-gap: 2px;
      width: max-content;
      li, label {
        display: contents;
      }
      input[type=checkbox] {
        grid-column: 1;
        margin-left: 9px;
        margin-right: 0;
      }
      .setting-label {
        grid-column: 2;
        padding: 6px 9px;
      }
      a.menu-link {
        grid-column: span 2;
        color: inherit;
        text-decoration: inherit;
        padding: 6px 9px;
        span {
          margin-left: 8px;
        }
        &:hover {
          background-color: main_outline_color(15%);
        }
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
      padding-top: 25px;
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
      $buttons-margin: 5px;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      button {
        width: 60px;
        height: 40px;
        border: none;
        border-radius: 20px;
        background-color: stage_button_background(60%);
        color: stage_button_foreground(5%);
        font-size: 20px;
        margin: 0 $buttons-margin;
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
      div.vol {
        position: relative;
        // "&:has(button.btn-mute:hover) > .volume-slider-popup" is better, but it doesn't work in current version of firefox without a special flag
        // "&:hover > div.volume-slider-popup" is a valid alternative as well, but then I'd have to set border-radius here as well
        button.btn-mute:hover + div.volume-slider-popup, div.volume-slider-popup:hover {
          display: flex;
        }
        .volume-slider-popup {
          $slider-height: 80px;
          $slider-width: 8px;
          position: absolute;
          left: 0;
          bottom: 100%;
          width: calc(100% - $buttons-margin * 3);
          box-sizing: border-box;
          padding: 10px 0 5px;
          margin: 0 $buttons-margin * 1.5 -1px;
          border-radius: 15px;
          opacity: 0.8;
          background-color: stage_button_background(25%);
          border: 1.5px solid main_outline_color(75%);
          display: none;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          input[type=range] {
            appearance: none;
            background-color: color-mix(in srgb, var(--page-fg) 50%, transparent);
            width: $slider-height;
            height: $slider-width;
            margin: calc(($slider-height - $slider-width) / 2) 0;
            padding: 0;
            transform: rotate(-90deg);
            overflow: hidden;
            // for whatever reason, chrome doesn't like comma-separated selectors with these pseudo-classes, so I can't merge these 2 groups
            &::-webkit-slider-thumb {
              -webkit-appearance: none;
              width: 0;
              box-shadow: -$slider-height 0 0 $slider-height stage_button_foreground(90%);
            }
            &::-moz-range-thumb {
              border: none;
              width: 0;
              box-shadow: -$slider-height 0 0 $slider-height stage_button_foreground(90%);
            }
          }
          span {
            user-select: none;
            padding-top: 2px;
            font-size: 14px;
            font-weight: bold;
            color: var(--page-fg);
            font-family: Roboto, Oxygen, Ubuntu, 'Segoe UI', 'Open Sans', Cantarell, 'Helvetica Neue', sans-serif;
          }
        }
      }
    }
  }
</style>