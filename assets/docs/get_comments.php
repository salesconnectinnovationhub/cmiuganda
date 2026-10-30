<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Access-Control-Allow-Origin: https://cmiconstruction.netlify.app");
header("Access-Control-Allow-Methods: *");
header("Access-Control-Allow-Headers: Content-Type");

$servername = "localhost";
$username = "root";
$password = "admin@root";
$dbname = "cmichat";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT * FROM comments ORDER BY comment_id DESC";
$stmt = $conn->query($sql);

if ($stmt->num_rows > 0) {
    while ($stmtresult = $stmt->fetch_assoc()) {
        ?>
        <div class="card">
            <div class="card-body">
                <div class="card_header">
                    <h5 class="card-title"><?= $stmtresult['commentor_name'] ?></h5>
                    <div class="rating">
                        <?php
                        for ($i = 1; $i <= $stmtresult['user_rating']; $i++) {
                            echo '<i class="fas fa-star" data-rating="' . $i . '"></i>';
                        }
                        ?>
                    </div>
                </div>
                <p class="card-text"><?= htmlspecialchars($stmtresult['user_comment']) ?></p>
            </div>
        </div>
        <?php
    }
} else {
    ?>
    <div class="card">
        <div class="card-body">
            <h5 class="card-title text-center">No comment yet</h5>
            <p class="card-text text-center">Be the first to comment!!</p>
        </div>
    </div>
    <?php
}

$conn->close();
?>
