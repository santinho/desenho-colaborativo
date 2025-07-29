# Use Maven OpenJDK 21 image with Maven pre-installed
FROM maven:3.9.5-openjdk-21-slim

# Set working directory
WORKDIR /app

# Copy all project files
COPY . .

# Build the application using Maven directly
RUN mvn clean package -DskipTests

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Run the application
CMD ["java", "-Dquarkus.http.host=0.0.0.0", "-Dquarkus.http.port=${PORT}", "-jar", "target/quarkus-app/quarkus-run.jar"]
