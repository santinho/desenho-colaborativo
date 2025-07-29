# Use OpenJDK 21 and install Maven
FROM openjdk:21-jdk-slim

# Install Maven
RUN apt-get update && \
    apt-get install -y wget && \
    wget https://archive.apache.org/dist/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.tar.gz && \
    tar -xzf apache-maven-3.9.5-bin.tar.gz -C /opt && \
    ln -s /opt/apache-maven-3.9.5 /opt/maven && \
    rm apache-maven-3.9.5-bin.tar.gz && \
    apt-get clean

# Set Maven environment variables
ENV MAVEN_HOME=/opt/maven
ENV PATH=$MAVEN_HOME/bin:$PATH

# Set working directory
WORKDIR /app

# Copy all project files
COPY . .

# Build the application using Maven
RUN mvn clean package -DskipTests

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Run the application
CMD ["java", "-Dquarkus.http.host=0.0.0.0", "-Dquarkus.http.port=${PORT}", "-jar", "target/quarkus-app/quarkus-run.jar"]
