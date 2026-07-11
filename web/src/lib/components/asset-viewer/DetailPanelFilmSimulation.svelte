<script lang="ts">
  import ClassicChromeBanner from '$lib/components/asset-viewer/ClassicChromeBanner.svelte';
  import FujifilmFilmSimulationBanner from '$lib/components/asset-viewer/FujifilmFilmSimulationBanner.svelte';
  import { getFilmSimulationGraphic } from '$lib/utils/film-simulation';
  import { filmSimulationBannerConfigs } from '$lib/utils/film-simulation-banner';

  interface Props {
    filmMode: string;
  }

  let { filmMode }: Props = $props();
  let graphic = $derived(getFilmSimulationGraphic(filmMode));
  let isClassicChrome = $derived(graphic?.label === 'CLASSIC CHROME');
  let bannerConfig = $derived(graphic?.banner ? filmSimulationBannerConfigs[graphic.banner] : undefined);
  let isVectorBanner = $derived(isClassicChrome || Boolean(bannerConfig));
</script>

<figure class={isVectorBanner ? '-mx-6 w-[calc(100%+3rem)] py-4' : 'w-full py-4'} data-testid="film-simulation-graphic">
  {#if isClassicChrome}
    <ClassicChromeBanner title={filmMode} />
  {:else if bannerConfig && graphic}
    <FujifilmFilmSimulationBanner config={bannerConfig} title={filmMode} displayLabel={graphic.label} />
  {:else if graphic}
    <img
      src={graphic.src}
      alt={`${graphic.label} film simulation`}
      title={filmMode}
      class="block aspect-square w-full rounded-2xl border border-black/10 object-cover shadow-sm dark:border-white/10"
      draggable="false"
    />
  {:else}
    <div
      class="flex min-h-32 w-full flex-col justify-end rounded-2xl border border-black/10 bg-linear-to-br from-neutral-100 to-neutral-300 p-5 shadow-sm dark:border-white/10 dark:from-neutral-700 dark:to-neutral-950"
    >
      <p class="text-xs font-semibold tracking-[0.2em] text-immich-fg/60 uppercase dark:text-immich-dark-fg/60">
        Film Simulation
      </p>
      <p class="mt-1 text-xl font-medium text-immich-fg dark:text-immich-dark-fg">{filmMode}</p>
    </div>
  {/if}
</figure>
