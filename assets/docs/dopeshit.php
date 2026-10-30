<?php
$servername = "localhost";
$username = "root";
$password = "@root";
$dbname = "cmichat";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// SQL to delete all comments
$sql = "DELETE FROM comments";

if ($conn->query($sql) === TRUE) {
    echo "All comments deleted successfully";
} else {
    echo "Error deleting comments: " . $conn->error;
}

// Close connection
$conn->close();
?>
