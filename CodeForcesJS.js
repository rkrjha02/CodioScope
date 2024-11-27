// ADD TAGS TO THE DROPDOWN FUNCTIONALITY

async function populateTagsDropdown() {
  const url = "https://codeforces.com/api/problemset.problems";
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Error fetching data from Codeforces API");
    }

    // Extract all tags from the problems
    const allTags = new Set();
    data.result.problems.forEach((problem) => {
      problem.tags.forEach((tag) => {
        allTags.add(tag); // Using Set to avoid duplicates
      });
    });

    // Get the dropdown element
    const topicDropdown = document.getElementById("topic-dropdown");

    // Create an option for each unique tag and append it to the dropdown
    allTags.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1); // Capitalize first letter
      topicDropdown.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
  }
}

// LAST 5 CONTEST ANALYSIS

function analyzeProgress(ratingData) {
  if (ratingData.length === 0) {
    return "No contest data available for analysis.";
  }

  const lastFiveRatings = ratingData.slice(-5); // Get the last five contests
  const progressData = lastFiveRatings.map((contest) => ({
    contestName: contest.contestName,
    oldRating: contest.oldRating,
    newRating: contest.newRating,
    change: contest.newRating - contest.oldRating,
  }));

  // Calculate statistics
  const ratingChanges = progressData.map((data) => data.change);
  const averageChange =
    ratingChanges.reduce((a, b) => a + b, 0) / ratingChanges.length;
  const totalOldRating = lastFiveRatings.reduce(
    (sum, contest) => sum + contest.oldRating,
    0
  );
  const averageOldRating = totalOldRating / lastFiveRatings.length;

  // Create analysis content
  let analysisHTML = `
        <h2 class="title is-4 has-text-centered">Progress Analysis</h2>
        <div class="box">
            <p><strong>Average Rating Change (Last 5 Contests):</strong> ${averageChange.toFixed(
              2
            )}</p>
            <p><strong>Average Old Rating (Last 5 Contests):</strong> ${averageOldRating.toFixed(
              2
            )}</p>
            <h3 class="subtitle is-6">Detailed Ratings:</h3>
            <ul>
    `;

  progressData.forEach((data) => {
    analysisHTML += `
            <li>
                <strong>${data.contestName}:</strong> 
                Old Rating: ${data.oldRating}, 
                New Rating: ${data.newRating}, 
                Change: ${data.change > 0 ? "+" : ""}${data.change}
            </li>
        `;
  });

  analysisHTML += `</ul></div>`;
  return analysisHTML;
}

async function fetchSolvedProblemsData(userName) {
  const url = `https://codeforces.com/api/user.status?handle=${userName}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== "OK") throw new Error("Error fetching user data");

    return data.result.filter((submission) => submission.verdict === "OK");
  } catch (error) {
    console.error("Error fetching solved problems data:", error);
    return [];
  }
}

async function plotSolvedProblemsHeatmap(userName) {
  const submissions = await fetchSolvedProblemsData(userName);

  // Group solved problems by year, month, and difficulty
  const groupedData = {};
  submissions.forEach((submission) => {
    if (!submission.problem.rating) return; // Ignore problems without ratings

    const date = new Date(submission.creationTimeSeconds * 1000);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    const rating = submission.problem.rating;

    if (!groupedData[monthYear]) {
      groupedData[monthYear] = {
        easy: 0,
        medium: 0,
        hard: 0,
      };
    }

    if (rating <= 1200) groupedData[monthYear].easy++;
    else if (rating <= 1800) groupedData[monthYear].medium++;
    else groupedData[monthYear].hard++;
  });

  // Prepare the data for the heatmap
  const labels = Object.keys(groupedData);
  const easyData = labels.map((label) => groupedData[label].easy);
  const mediumData = labels.map((label) => groupedData[label].medium);
  const hardData = labels.map((label) => groupedData[label].hard);

  const ctx = document.getElementById("heatmapCanvas").getContext("2d");

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels, // Month-Year labels
      datasets: [
        {
          label: "Easy Problems",
          data: easyData,
          backgroundColor: "rgba(75, 192, 192, 0.8)",
          stack: "Stack 0",
        },
        {
          label: "Medium Problems",
          data: mediumData,
          backgroundColor: "rgba(255, 159, 64, 0.8)",
          stack: "Stack 0",
        },
        {
          label: "Hard Problems",
          data: hardData,
          backgroundColor: "rgba(255, 99, 132, 0.8)",
          stack: "Stack 0",
        },
      ],
    },
    options: {
      scales: {
        x: {
          title: {
            display: true,
            text: "Month-Year",
          },
        },
        y: {
          title: {
            display: true,
            text: "Number of Problems Solved",
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: true,
        },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const submitButton = document.querySelector("#usernameform button");

  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();

    const userNameInput = document.querySelector("#username");
    const difficultySelect = document.querySelector("#difficulty");
    const topicInput = document.querySelector("#topic-dropdown");

    const userName = userNameInput.value.trim();
    const difficulty = difficultySelect.value; // Corrected to get value
    const topic = topicInput.value.trim().toLowerCase(); // Corrected to get value

    if (!userName) {
      alert("Please enter a username");
      return;
    }

    try {
      const userInfo = await fetchUserInfo(userName);
      const userRatings = await fetchUserRatings(userName);
      const solvedCount = await fetchSolvedProblems(
        userName,
        difficulty,
        topic
      );

      if (userInfo.status === "OK" && userRatings.status === "OK") {
        displayUserInfo(
          userInfo.result[0],
          userName,
          solvedCount,
          difficulty,
          topic
        ); // Pass difficulty and topic
        displayLatestUserRating(userRatings.result);
        plotRatingsChart(userRatings.result);

        const analysisHTML = analyzeProgress(userRatings.result);
        document.getElementById("analysis").innerHTML = analysisHTML;

        plotSolvedProblemsHeatmap(userName);
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

async function fetchSolvedProblems(userName, difficulty, topic) {
  const BaseURL = `https://codeforces.com/api/user.status?handle=${userName}`;
  let response = await fetch(BaseURL);
  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error("Error fetching data from Codeforces API");
  }

  const submissions = data.result;
  const solvedProblems = new Set();

  // Define difficulty ranges based on labels
  const difficultyRange = {
    easy: { min: 800, max: 1200 },
    medium: { min: 1201, max: 1800 },
    hard: { min: 1801, max: 10000 },
  };

  const selectedRange = difficultyRange[difficulty];

  submissions.forEach((submission) => {
    if (submission.verdict === "OK" && submission.problem.rating) {
      const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
      const problemRating = submission.problem.rating;

      // Check if problem falls within the difficulty range and contains the topic tag
      if (
        problemRating >= selectedRange.min &&
        problemRating <= selectedRange.max
      ) {
        if (
          submission.problem.tags.some((tag) => tag.toLowerCase() === topic)
        ) {
          solvedProblems.add(problemId);
        }
      }
    }
  });

  return solvedProblems.size;
}

function displayUserInfo(userInfo, userName, solvedCount, difficulty, topic) {
  const container = document.getElementById("userInfo");
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
                    <p><strong>Problems Solved (Difficulty: ${difficulty}, Topic: ${topic}):</strong> ${solvedCount}</p>
                </div>
            </div>
        </div>
    `;
}

// displayLatestUserRating and plotRatingsChart

function displayLatestUserRating(ratingData) {
  const container = document.getElementById("latestRating");
  const latestContest = ratingData[ratingData.length - 1];

  const contestHTML = `
        <h2 class="title is-4 has-text-centered">Latest Contest</h2>
        <div class="box">
            <p><strong>Contest Name:</strong> ${latestContest.contestName}</p>
            <p><strong>Rank:</strong> ${latestContest.rank}</p>
            <p><strong>Old Rating:</strong> ${latestContest.oldRating}</p>
            <p><strong>New Rating:</strong> ${latestContest.newRating}</p>
        </div>
    `;

  container.innerHTML += contestHTML;
}

function plotRatingsChart(ratingData) {
  const container = document.getElementById("contestGraph");
  const canvas = document.createElement("canvas");
  canvas.id = "ratingsChart";
  container.appendChild(canvas);

  const labels = ratingData.map((item) => {
    // Convert startTimeSeconds to a Date object
    const contestDate = new Date(item.startTimeSeconds * 1000);

    // Check if the date is valid
    if (isNaN(contestDate)) {
      console.error(`Invalid date for contest: ${item.contestName}`);
      return "Invalid Date"; // Fallback label
    }

    return contestDate.toLocaleDateString(); // Format the date as needed
  });

  const ratings = ratingData.map((item) => item.newRating);

  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "User Ratings Over Time",
          data: ratings,
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        x: { display: true, title: { display: true, text: "Date" } },
        y: { display: true, title: { display: true, text: "Rating" } },
      },
    },
  });
}

populateTagsDropdown();

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
