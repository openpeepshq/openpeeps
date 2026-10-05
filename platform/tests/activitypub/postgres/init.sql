# PostgreSQL databases for each service
CREATE DATABASE openpeeps_alpha;
CREATE DATABASE openpeeps_beta;
CREATE DATABASE mastodon_production;
GRANT ALL PRIVILEGES ON DATABASE openpeeps_alpha TO openpeeps;
GRANT ALL PRIVILEGES ON DATABASE openpeeps_beta TO openpeeps;
GRANT ALL PRIVILEGES ON DATABASE mastodon_production TO openpeeps;
