document.addEventListener("DOMContentLoaded", () => {
  const submitButton = document.querySelector("#usernameform button");

  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const userNameInput = document.querySelector("#username");
    const userName = userNameInput.value.trim();

    const topicInput = document.querySelector("#topic");
    const topic = topicInput.value.trim();

    const difficultyInput = document.querySelector("#difficulty");
    const difficulty = difficultyInput.value.trim();

    if (!userName) {
      alert("Please enter a username");
      return;
    }

    try {
      const userInfo = await fetchUserInfo(userName);
      const userRatings = await fetchUserRatings(userName);
      const solvedCount = await fetchSolvedProblems(
        userName,
        topic,
        difficulty
      );

      if (userInfo.status === "OK" && userRatings.status === "OK") {
        displayUserInfo(userInfo.result[0], userName, solvedCount);
        displayLatestUserRating(userRatings.result);
        plotRatingsChart(userRatings.result);
      } else {
        alert("Username Not Found on Codeforces!!!");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch data. Please try again.");
    }
  });
});

async function fetchUserInfo(userName) {
  const BaseURL = `https://codeforces.com/api/user.info?handles=${userName}`;
  let response = await fetch(BaseURL);
  return await response.json();
}

async function fetchUserRatings(userName) {
  const BaseURL = `https://codeforces.com/api/user.rating?handle=${userName}`;
  let response = await fetch(BaseURL);
  return await response.json();
}

async function fetchSolvedProblems(userName, topic, difficulty) {
  const BaseURL = `https://codeforces.com/api/user.status?handle=${userName}`;
  let response = await fetch(BaseURL);
  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error("Error fetching data from Codeforces API");
  }

  const submissions = data.result;
  const solvedProblems = new Set();
  let topicSolvedCount = 0;

  submissions.forEach((submission) => {
    if (submission.verdict === "OK") {
      const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
      const problemTags = submission.problem.tags;
      const problemDifficulty = submission.problem.rating || 0; // If there's no rating, treat it as 0.

      if (
        problemTags.includes(topic) &&
        (!difficulty || problemDifficulty === parseInt(difficulty))
      ) {
        solvedProblems.add(problemId);
        topicSolvedCount++;
      }
    }
  });
  return topicSolvedCount;
}

function displayUserInfo(userInfo, userName, solvedCount) {
  const container = document.getElementById("container");
  container.innerHTML = `
        <h2 class="title is-4 has-text-centered">User Info</h2>
        <div class="card mb-4">
            <div class="card-image">
                <figure class="image is-128x128 mt-3 ml-3">
                    <img src="${userInfo.avatar}" alt="User Avatar">
                </figure>
            </div>
            <div class="card-content">
                <div class="media">
                    <div class="media-content">
                        <p class="title is-4">${userInfo.firstName} ${
    userInfo.lastName
  }</p>
                        <p class="subtitle is-6">@${userName}</p>
                    </div>
                </div>
                <div class="content">
                    <p><strong>Rank:</strong> ${userInfo.rank}</p>
                    <p><strong>Location:</strong> ${userInfo.city}, ${
    userInfo.country
  }</p>
                    <p><strong>Organisation:</strong> ${
                      userInfo.organization
                    }</p>
                    <p><strong>Contribution:</strong> ${
                      userInfo.contribution
                    }</p>
                    <p><strong>Friend Count:</strong> ${
                      userInfo.friendOfCount
                    }</p>
                    <p><strong>Last Online:</strong> ${convertUnixTimeToNormalTime(
                      userInfo.lastOnlineTimeSeconds
                    )}</p>
                    <p><strong>Registration:</strong> ${convertUnixTimeToNormalTime(
                      userInfo.registrationTimeSeconds
                    )}</p>
                    <p><strong>Problems Solved on "${topic}" (${
    difficulty ? `Difficulty: ${difficulty}` : "All Difficulties"
  }):</strong> ${solvedCount}</p>
                </div>
            </div>
        </div>
    `;
}

function displayLatestUserRating(userRatings) {
  const container = document.getElementById("container");
  const latestRating = userRatings[userRatings.length - 1];

  container.innerHTML += `
        <h2 class="title is-4 has-text-centered">Latest User Rating</h2>
        <div class="card mb-4 ${
          document.body.classList.contains("dark-mode")
            ? "dark-mode"
            : "light-mode"
        }">
            <header class="card-header">
                <p class="card-header-title">
                    Contest: ${latestRating.contestName}
                </p>
            </header>
            <div class="card-content">
                <div class="content">
                    <p><strong>Contest ID:</strong> ${
                      latestRating.contestId
                    }</p>
                    <p><strong>Rank:</strong> ${latestRating.rank}</p>
                    <p><strong>Old Rating:</strong> ${
                      latestRating.oldRating
                    }</p>
                    <p><strong>New Rating:</strong> ${
                      latestRating.newRating
                    }</p>
                    <p><strong>Performance:</strong> ${
                      latestRating.performance
                    }</p>
                    <p><strong>Rating Change:</strong> ${
                      latestRating.newRating - latestRating.oldRating
                    }</p>
                </div>
            </div>
        </div>
    `;
}

function plotRatingsChart(userRatings) {
  const container = document.getElementById("container");
  container.innerHTML += `
        <h2 class="title is-4 has-text-centered">Rating Progression Chart</h2>
        <div class="card mb-4 ${
          document.body.classList.contains("dark-mode")
            ? "dark-mode"
            : "light-mode"
        }">
            <div class="card-content">
                <canvas id="ratingsChart"></canvas>
            </div>
        </div>
    `;

  const ctx = document.getElementById("ratingsChart").getContext("2d");

  const labels = userRatings.map((rating) => {
    const date = new Date(rating.ratingUpdateTimeSeconds * 1000);
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  });

  const data = userRatings.map((rating) => rating.newRating);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Rating",
          data: data,
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 2,
          fill: false,
          pointBackgroundColor: "rgba(75, 192, 192, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(75, 192, 192, 1)",
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Date",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Rating",
          },
        },
      },
    },
  });
}

function convertUnixTimeToNormalTime(unixTimestamp) {
  if (isNaN(unixTimestamp)) {
    return "Invalid input: Please provide a valid Unix timestamp.";
  }

  const date = new Date(unixTimestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}
