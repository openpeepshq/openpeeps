<script lang="ts">
  import { page } from '$app/state';
</script>

<section class="error-container">
  <h1>Whoops! Something went wrong...</h1>
  <p>Error Info: {page.error?.message || 'An undefined issue occurred.'}</p>
  <a href="/">Go Home</a>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
    background-color: #f8f8f8;
  }
  .error-container {
    text-align: center;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #fff;
  }
  .error-container h1 {
    font-size: 24px;
    margin-bottom: 3rem;
    color: #333;
  }
  .error-container p {
    font-size: 16px;
    color: #666;
    margin-bottom: 20px;
  }
  .error-container a {
    text-decoration: none;
    color: #007bff;
    border: 1px solid #edf3f7;
    padding: 10px 20px;
    border-radius: 5px;
    transition:
      background-color 0.3s,
      color 0.3s;
  }
  .error-container a:hover {
    background-color: #edf3f7;
  }
  @media (max-width: 600px) {
    .error-container {
      width: 90%;
      padding: 15px;
      margin: auto;
    }
    .error-container h1 {
      font-size: 20px;
    }
    .error-container a {
      padding: 8px 16px;
    }
  }
</style>
