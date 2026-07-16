<template>
  <div>
    <h1>Back-button scroll restoration repro</h1>
    <p>
      1. Scroll down so a link below is in view.<br />
      2. Click either link — the page jumps down to <code>#foot</code>.<br />
      3. Press the browser <strong>Back</strong> button.
    </p>
    <p>
      Expected: you return to where you were (where you clicked the link).<br />
      Actual: the page jumps to the very top (scrollY = 0).
    </p>

    <div style="height: 2000px; background: #f3f3f3">spacer top</div>

    <p>
      <!-- Plain native anchor -->
      <a id="native" href="#foot">native &lt;a href="#foot"&gt;</a>
      &nbsp;|&nbsp;
      <!-- Framework router link -->
      <NuxtLink id="nuxt" to="#foot">&lt;NuxtLink to="#foot"&gt;</NuxtLink>
    </p>

    <div style="height: 4000px; background: #eef">spacer middle</div>

    <div id="foot" style="height: 200px; background: #dfd">FOOT TARGET (#foot)</div>

    <div style="height: 2000px; background: #f3f3f3">spacer bottom</div>
  </div>
</template>
